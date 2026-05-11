"""
FastAPI dashboard server — read-only endpoints consumed by the Next.js frontend.
Run via: python -m src.main --mode dashboard
"""
from __future__ import annotations

import json
import os
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair  # type: ignore

from src.config import CONFIG, RUNTIME_OVERRIDES

_LLM_KEY_FILE = Path("/opt/meteora-agent/var/anthropic-key.txt")
from src.db import Database
from src.dashboard.auth import require_auth, router as auth_router
from src.dashboard.admin import router as admin_router
from src.dashboard.vault_api import router as vault_router
from src.dashboard.wallet import get_balance


# --- Response models matching lib/api.ts interfaces ---

class AgentStatus(BaseModel):
    mode: str
    network: str
    walletPubkey: str
    serviceStatus: str
    killSwitchPresent: bool
    liveGatePass: bool
    dryRun: bool


class KpiSummary(BaseModel):
    openPositions: int
    dailyFeesUsd: float
    totalDeployedUsd: float
    pnlDayUsd: float
    pnlWeekUsd: float
    maxPositionUsd: float
    maxTotalDeployedUsd: float
    dailyLossLimitPct: float
    dailyLossCurrentPct: float


class ActivityItem(BaseModel):
    id: int
    positionId: str | None
    poolAddress: str
    poolName: str
    actionType: str
    reason: str
    decidedAt: str
    executedAt: str | None
    txSignature: str | None
    success: bool | None


class RiskUtilization(BaseModel):
    positionUtilPct: float
    totalDeployedUtilPct: float
    dailyLossGuardStatus: str


class SafetyConfig(BaseModel):
    dryRun: bool
    killSwitchPresent: bool
    killSwitchPath: str
    liveGatePass: bool
    maxPositionUsd: float
    maxTotalDeployedUsd: float
    dailyLossLimitPct: float
    maxOpenPositions: int
    network: str


class WalletBalance(BaseModel):
    address: str
    solBalance: float
    usdcBalance: float
    usdcMint: str


# --- Startup / shutdown ---

_db: Database
_wallet_pubkey: str


def _load_keypair(path: Path) -> Keypair:
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    return Keypair.from_bytes(bytes(raw))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db, _wallet_pubkey
    cfg = CONFIG
    assert cfg is not None, "CONFIG must be loaded to run the dashboard"
    _db = Database(cfg.database_url)
    await _db.connect()
    keypair = _load_keypair(cfg.hot_wallet_keypair_path)
    _wallet_pubkey = str(keypair.pubkey())
    app.state.wallet_keypair = keypair
    app.state.rpc = AsyncClient(cfg.rpc_url)
    # Arm kill switch on fresh start so agent is paused until operator explicitly resumes
    ks = Path(cfg.kill_switch_file)
    if not ks.exists():
        ks.parent.mkdir(parents=True, exist_ok=True)
        ks.touch()
    yield
    await _db.close()
    await app.state.rpc.close()


app = FastAPI(title="Meteora Agent Dashboard API", version="1.0.0", lifespan=lifespan)

_allowed_origins = os.getenv("DASHBOARD_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(vault_router)


# --- Endpoints ---

@app.get("/status", response_model=AgentStatus)
async def get_status() -> AgentStatus:
    cfg = CONFIG
    assert cfg is not None
    kill_present = Path(cfg.kill_switch_file).exists()
    return AgentStatus(
        mode="DRY_RUN" if cfg.dry_run else "LIVE",
        network=cfg.network,
        walletPubkey=_wallet_pubkey,
        serviceStatus="active",
        killSwitchPresent=kill_present,
        liveGatePass=not kill_present,
        dryRun=cfg.dry_run,
    )


@app.get("/kpi", response_model=KpiSummary)
async def get_kpi() -> KpiSummary:
    cfg = CONFIG
    assert cfg is not None
    stats = await _db.get_position_stats()
    wallet = await get_balance(app.state.rpc, app.state.wallet_keypair.pubkey(), cfg.network)
    current_equity_usd = stats["total_deployed"] + float(wallet["usdcBalance"])
    day_start = await _db.get_today_starting_value()
    week_start = await _db.get_starting_value_days_ago(7)
    pnl_day = current_equity_usd - day_start if day_start > 0 else 0.0
    pnl_week = current_equity_usd - week_start if week_start is not None else 0.0
    daily_loss_pct = (
        max(0.0, (day_start - current_equity_usd) / day_start * 100.0)
        if day_start > 0
        else 0.0
    )
    return KpiSummary(
        openPositions=stats["open_count"],
        dailyFeesUsd=stats["fees_earned"],
        totalDeployedUsd=stats["total_deployed"],
        pnlDayUsd=pnl_day,
        pnlWeekUsd=pnl_week,
        maxPositionUsd=RUNTIME_OVERRIDES.get("max_position_usd", cfg.max_position_usd),
        maxTotalDeployedUsd=RUNTIME_OVERRIDES.get("max_total_deployed_usd", cfg.max_total_deployed_usd),
        dailyLossLimitPct=RUNTIME_OVERRIDES.get("daily_loss_limit_pct", cfg.daily_loss_limit_pct),
        dailyLossCurrentPct=daily_loss_pct,
    )


@app.get("/activity", response_model=list[ActivityItem])
async def get_activity(limit: int = Query(default=20, ge=1, le=200)) -> list[ActivityItem]:
    rows = await _db.get_activity(limit)
    return [ActivityItem(**row) for row in rows]


@app.get("/activity/private", response_model=list[ActivityItem])
async def get_activity_private(
    _auth: dict = Depends(require_auth),
    limit: int = Query(default=20, ge=1, le=200),
) -> list[ActivityItem]:
    rows = await _db.get_activity(limit)
    return [ActivityItem(**row) for row in rows]


@app.get("/risk", response_model=RiskUtilization)
async def get_risk() -> RiskUtilization:
    cfg = CONFIG
    assert cfg is not None
    stats = await _db.get_position_stats()

    max_dep = RUNTIME_OVERRIDES.get("max_total_deployed_usd", cfg.max_total_deployed_usd)
    loss_limit = RUNTIME_OVERRIDES.get("daily_loss_limit_pct", cfg.daily_loss_limit_pct)

    pos_util = (stats["open_count"] / cfg.max_open_positions * 100) if cfg.max_open_positions > 0 else 0.0
    dep_util = (stats["total_deployed"] / max_dep * 100) if max_dep > 0 else 0.0
    loss_pct = stats["daily_loss_pct"]

    if loss_pct >= loss_limit:
        guard = "tripped"
    elif loss_pct >= loss_limit * 0.8:
        guard = "warning"
    else:
        guard = "ok"

    return RiskUtilization(
        positionUtilPct=min(100.0, pos_util),
        totalDeployedUtilPct=min(100.0, dep_util),
        dailyLossGuardStatus=guard,
    )


@app.get("/safety", response_model=SafetyConfig)
async def get_safety() -> SafetyConfig:
    cfg = CONFIG
    assert cfg is not None
    kill_present = Path(cfg.kill_switch_file).exists()
    return SafetyConfig(
        dryRun=cfg.dry_run,
        killSwitchPresent=kill_present,
        killSwitchPath=str(cfg.kill_switch_file),
        liveGatePass=not kill_present,
        maxPositionUsd=RUNTIME_OVERRIDES.get("max_position_usd", cfg.max_position_usd),
        maxTotalDeployedUsd=RUNTIME_OVERRIDES.get("max_total_deployed_usd", cfg.max_total_deployed_usd),
        dailyLossLimitPct=RUNTIME_OVERRIDES.get("daily_loss_limit_pct", cfg.daily_loss_limit_pct),
        maxOpenPositions=cfg.max_open_positions,
        network=cfg.network,
    )


@app.get("/wallet/balance", response_model=WalletBalance)
async def get_wallet_balance() -> WalletBalance:
    cfg = CONFIG
    assert cfg is not None
    balance = await get_balance(app.state.rpc, app.state.wallet_keypair.pubkey(), cfg.network)
    return WalletBalance(**balance)


class AgentState(BaseModel):
    llmEnabled: bool
    llmDisabledByOperator: bool
    anthropicKeyConfigured: bool
    tunedAt: str | None
    rebalanceDriftBps: int
    exitVolatilityPct: float
    reasoning: str | None
    baseRangeBins: int


_STATE_FILE = Path("/opt/meteora-agent/var/agent-state.json")


@app.get("/agent/state", response_model=AgentState)
async def get_agent_state() -> AgentState:
    cfg = CONFIG
    assert cfg is not None
    _openai_key_file = Path("/opt/meteora-agent/var/openai-key.txt")
    key_configured = (
        bool(cfg.anthropic_api_key)
        or bool(os.getenv("ANTHROPIC_API_KEY"))
        or bool(os.getenv("OPENAI_API_KEY"))
        or _LLM_KEY_FILE.exists()
        or _openai_key_file.exists()
    )
    if _STATE_FILE.exists():
        try:
            with open(_STATE_FILE) as f:
                data = json.load(f)
            state = AgentState(**data, baseRangeBins=cfg.target_position_width_bins)
            return state.model_copy(update={"anthropicKeyConfigured": key_configured})
        except Exception:
            pass
    return AgentState(
        llmEnabled=key_configured and not cfg.llm_disabled_file.exists(),
        llmDisabledByOperator=cfg.llm_disabled_file.exists(),
        anthropicKeyConfigured=key_configured,
        tunedAt=None,
        rebalanceDriftBps=cfg.rebalance_drift_bps,
        exitVolatilityPct=cfg.exit_volatility_24h_pct,
        reasoning=None,
        baseRangeBins=cfg.target_position_width_bins,
    )


class ProofSnapshot(BaseModel):
    gitLog: list[str]
    agentMode: str
    agentNetwork: str
    dbReachable: bool
    recentActions: list[dict]


@app.get("/proof", response_model=ProofSnapshot)
async def get_proof() -> ProofSnapshot:
    cfg = CONFIG
    assert cfg is not None

    repo_root = Path(__file__).parent.parent.parent
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-4"],
            capture_output=True, text=True, timeout=5, cwd=repo_root,
        )
        git_log = result.stdout.strip().splitlines()
    except Exception:
        git_log = []

    db_reachable = False
    recent_actions: list[dict] = []
    try:
        rows = await _db.get_activity(3)
        recent_actions = rows
        db_reachable = True
    except Exception:
        pass

    return ProofSnapshot(
        gitLog=git_log,
        agentMode="DRY_RUN" if cfg.dry_run else "LIVE",
        agentNetwork=cfg.network,
        dbReachable=db_reachable,
        recentActions=recent_actions,
    )
