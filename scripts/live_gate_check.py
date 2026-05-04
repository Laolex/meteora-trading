#!/usr/bin/env python3
"""
Live-readiness gate for Meteora agent.

Behavior:
- If DRY_RUN=true (default), exits 0 and prints informational status.
- If DRY_RUN=false, enforces a strict set of checks and exits non-zero on failure.

Use --force-live-check to run the strict checks even when DRY_RUN=true.
"""

from __future__ import annotations

import argparse
import os
import re
import shlex
import stat
import subprocess
import sys
from pathlib import Path
from typing import Dict, List
from urllib import request, error

ROOT = Path("/opt/meteora-agent")
ENV_PATH = ROOT / ".env"
REQUIRED_TABLES = [
    "pools",
    "pool_snapshots",
    "pool_scores",
    "positions",
    "actions_log",
    "pnl_daily",
]


def parse_env_file(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not path.exists():
        raise RuntimeError(f"Missing env file: {path}")

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        env[key] = val

    # one-pass ${VAR} expansion from parsed env
    var_pattern = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}")

    def _expand(v: str) -> str:
        def repl(m: re.Match[str]) -> str:
            k = m.group(1)
            return env.get(k, os.environ.get(k, ""))

        return var_pattern.sub(repl, v)

    for k in list(env.keys()):
        env[k] = _expand(env[k])

    return env


def run(cmd: str, timeout: int = 30) -> str:
    proc = subprocess.run(
        shlex.split(cmd),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip()
        stdout = proc.stdout.strip()
        detail = stderr or stdout or f"exit={proc.returncode}"
        raise RuntimeError(f"Command failed: {cmd} :: {detail}")
    return proc.stdout.strip()


def parse_node_version(v: str) -> tuple[int, int, int]:
    # e.g. v20.20.2
    m = re.match(r"v?(\d+)\.(\d+)\.(\d+)", v.strip())
    if not m:
        raise RuntimeError(f"Unexpected node version format: {v}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


PLACEHOLDER_PATTERNS = [
    re.compile(r"^\*+$"),
    re.compile(r"replace", re.IGNORECASE),
    re.compile(r"changeme", re.IGNORECASE),
    re.compile(r"your[_-]?key", re.IGNORECASE),
    re.compile(r"dummy", re.IGNORECASE),
]


def looks_placeholder(value: str) -> bool:
    v = value.strip()
    if not v:
        return True
    return any(p.search(v) for p in PLACEHOLDER_PATTERNS)


def check_rpc_health(rpc_url: str) -> None:
    payload = b'{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
    req = request.Request(rpc_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with request.urlopen(req, timeout=8) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            if resp.status != 200:
                raise RuntimeError(f"RPC status {resp.status}")
            if "result" not in body and "ok" not in body:
                raise RuntimeError(f"Unexpected RPC response: {body[:200]}")
    except error.URLError as e:
        raise RuntimeError(f"RPC health check failed: {e}") from e


def check_db(database_url: str) -> None:
    run(f"psql {shlex.quote(database_url)} -At -c 'select 1'", timeout=20)
    tables = run(
        f"psql {shlex.quote(database_url)} -At -c \"select tablename from pg_tables where schemaname='public'\"",
        timeout=20,
    ).splitlines()
    missing = [t for t in REQUIRED_TABLES if t not in tables]
    if missing:
        raise RuntimeError(f"Missing required DB tables: {', '.join(missing)}")


def check_file_secure(path: Path, max_mode: int = 0o600) -> None:
    if not path.exists():
        raise RuntimeError(f"Missing file: {path}")
    st = path.stat()
    mode = stat.S_IMODE(st.st_mode)
    if mode > max_mode:
        raise RuntimeError(f"Insecure permissions on {path}: {oct(mode)} (expected <= {oct(max_mode)})")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-live-check", action="store_true", help="Run strict checks even if DRY_RUN=true")
    args = parser.parse_args()

    env = parse_env_file(ENV_PATH)

    dry_run = env.get("DRY_RUN", "").lower() == "true"
    enforce = args.force_live_check or not dry_run

    errors: List[str] = []
    warnings: List[str] = []

    # Always-valid baseline checks
    try:
        node_v = run("node -v")
        major, minor, patch = parse_node_version(node_v)
        if (major, minor, patch) < (20, 18, 0):
            errors.append(f"Node.js too old: {node_v}; require >= v20.18.0")
    except Exception as e:
        errors.append(str(e))

    helper_path = ROOT / env.get("NODE_HELPER_PATH", "node-helper/index.js")
    if not helper_path.exists():
        errors.append(f"NODE_HELPER_PATH missing: {helper_path}")

    map_path_raw = env.get("NODE_HELPER_POSITION_MAP_PATH", "")
    if not map_path_raw:
        errors.append("NODE_HELPER_POSITION_MAP_PATH is missing")
    else:
        map_path = Path(map_path_raw)
        if str(map_path).startswith("/tmp/"):
            errors.append("NODE_HELPER_POSITION_MAP_PATH must not be under /tmp for live mode")

    # Strict checks (block DRY_RUN=false)
    if enforce:
        network = env.get("NETWORK", "").lower()
        if network != "mainnet":
            errors.append(f"NETWORK must be mainnet for live mode (current: {network or 'unset'})")

        helius_key = env.get("HELIUS_API_KEY", "")
        if looks_placeholder(helius_key):
            errors.append("HELIUS_API_KEY looks unset/placeholder")

        if env.get("LIVE_GATE_ACK", "").lower() != "true":
            errors.append("LIVE_GATE_ACK=true is required to arm live mode")

        keypair = Path(env.get("HOT_WALLET_KEYPAIR_PATH", ""))
        try:
            check_file_secure(keypair, max_mode=0o600)
        except Exception as e:
            errors.append(str(e))

        db_url = env.get("DATABASE_URL", "")
        if not db_url:
            errors.append("DATABASE_URL is missing")
        else:
            try:
                check_db(db_url)
            except Exception as e:
                errors.append(str(e))

        rpc_url = env.get("SOLANA_RPC_URL", "")
        if not rpc_url:
            errors.append("SOLANA_RPC_URL is missing")
        else:
            try:
                check_rpc_health(rpc_url)
            except Exception as e:
                errors.append(str(e))

        kill_switch_file = Path(env.get("KILL_SWITCH_FILE", "/tmp/meteora-killswitch"))
        if kill_switch_file.exists():
            warnings.append(
                f"Kill switch is present at {kill_switch_file}. This is safe, but live entries will stay blocked until you remove it."
            )

        try:
            max_pos = float(env.get("MAX_POSITION_USD", "0"))
            max_total = float(env.get("MAX_TOTAL_DEPLOYED_USD", "0"))
            if max_pos > 25:
                warnings.append(
                    f"MAX_POSITION_USD={max_pos:.2f}. For first live rollout, consider <= 25.00"
                )
            if max_total > 100:
                warnings.append(
                    f"MAX_TOTAL_DEPLOYED_USD={max_total:.2f}. For first live rollout, consider <= 100.00"
                )
        except Exception:
            warnings.append("Could not parse MAX_POSITION_USD / MAX_TOTAL_DEPLOYED_USD")

    mode = "ENFORCED (live)" if enforce else "INFO (dry-run)"
    print(f"[live-gate] mode: {mode}")

    if warnings:
        print("[live-gate] warnings:")
        for w in warnings:
            print(f"  - {w}")

    if errors:
        print("[live-gate] FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("[live-gate] PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
