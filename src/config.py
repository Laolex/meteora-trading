"""
Centralized config with startup validation.
Missing or invalid env vars throw immediately — no silent defaults for safety-critical values.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

Network = Literal["devnet", "mainnet"]


def _required(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"Missing required env var: {key}")
    return val


def _required_int(key: str) -> int:
    return int(_required(key))


def _required_float(key: str) -> float:
    return float(_required(key))


def _required_bool(key: str) -> bool:
    val = _required(key).lower()
    if val not in ("true", "false"):
        raise RuntimeError(f"{key} must be 'true' or 'false', got: {val}")
    return val == "true"


def _optional(key: str, default: str) -> str:
    val = os.getenv(key)
    return val if val is not None and val != "" else default


def _optional_int(key: str, default: int) -> int:
    val = os.getenv(key)
    return int(val) if val not in (None, "") else default


def _optional_float(key: str, default: float) -> float:
    val = os.getenv(key)
    return float(val) if val not in (None, "") else default


@dataclass(frozen=True)
class Config:
    # RPC
    helius_api_key: str
    solana_rpc_url: str
    solana_devnet_rpc_url: str

    # Wallet
    hot_wallet_keypair_path: Path

    # DB
    database_url: str

    # Execution
    node_helper_path: Path
    default_position_size_usd: float
    target_position_width_bins: int
    max_open_positions: int

    # Meteora
    meteora_api_base: str

    # Mode
    dry_run: bool
    network: Network
    loop_interval_seconds: int

    # Safety
    max_position_usd: float
    max_total_deployed_usd: float
    daily_loss_limit_pct: float
    kill_switch_file: Path

    # Scoring
    score_weight_fees_24h: float
    score_weight_volume_tvl: float
    score_weight_token_quality: float
    score_weight_bin_liquidity: float

    # Rebalance
    rebalance_drift_bps: int
    rebalance_min_fees_usd: float
    exit_volatility_24h_pct: float

    # Dashboard
    dashboard_port: int
    dashboard_host: str

    # Logging
    log_level: str
    log_file: Path

    @property
    def rpc_url(self) -> str:
        return self.solana_rpc_url if self.network == "mainnet" else self.solana_devnet_rpc_url

    def validate(self) -> None:
        weights_sum = (
            self.score_weight_fees_24h
            + self.score_weight_volume_tvl
            + self.score_weight_token_quality
            + self.score_weight_bin_liquidity
        )
        if abs(weights_sum - 1.0) > 1e-6:
            raise RuntimeError(f"Scoring weights must sum to 1.0, got {weights_sum}")

        if self.network == "mainnet" and self.dry_run is False:
            # Loud warning surface — main entrypoint should re-confirm
            import sys
            print("⚠️  MAINNET + DRY_RUN=false — agent will send real transactions", file=sys.stderr)

        if not self.hot_wallet_keypair_path.exists():
            raise RuntimeError(f"Wallet keypair not found at {self.hot_wallet_keypair_path}")

        if self.default_position_size_usd <= 0:
            raise RuntimeError("DEFAULT_POSITION_SIZE_USD must be > 0")

        if self.target_position_width_bins <= 0:
            raise RuntimeError("TARGET_POSITION_WIDTH_BINS must be > 0")

        if self.max_open_positions <= 0:
            raise RuntimeError("MAX_OPEN_POSITIONS must be > 0")


def load_config() -> Config:
    network = _required("NETWORK")
    if network not in ("devnet", "mainnet"):
        raise RuntimeError(f"NETWORK must be 'devnet' or 'mainnet', got: {network}")

    cfg = Config(
        helius_api_key=_required("HELIUS_API_KEY"),
        solana_rpc_url=_required("SOLANA_RPC_URL"),
        solana_devnet_rpc_url=_required("SOLANA_DEVNET_RPC_URL"),
        hot_wallet_keypair_path=Path(_required("HOT_WALLET_KEYPAIR_PATH")),
        database_url=_required("DATABASE_URL"),
        node_helper_path=Path(_optional("NODE_HELPER_PATH", "node-helper/index.js")),
        default_position_size_usd=_optional_float("DEFAULT_POSITION_SIZE_USD", 100.0),
        target_position_width_bins=_optional_int("TARGET_POSITION_WIDTH_BINS", 40),
        max_open_positions=_optional_int("MAX_OPEN_POSITIONS", 1),
        meteora_api_base=_required("METEORA_API_BASE"),
        dry_run=_required_bool("DRY_RUN"),
        network=network,  # type: ignore[arg-type]
        loop_interval_seconds=_required_int("LOOP_INTERVAL_SECONDS"),
        max_position_usd=_required_float("MAX_POSITION_USD"),
        max_total_deployed_usd=_required_float("MAX_TOTAL_DEPLOYED_USD"),
        daily_loss_limit_pct=_required_float("DAILY_LOSS_LIMIT_PCT"),
        kill_switch_file=Path(_required("KILL_SWITCH_FILE")),
        score_weight_fees_24h=_required_float("SCORE_WEIGHT_FEES_24H"),
        score_weight_volume_tvl=_required_float("SCORE_WEIGHT_VOLUME_TVL"),
        score_weight_token_quality=_required_float("SCORE_WEIGHT_TOKEN_QUALITY"),
        score_weight_bin_liquidity=_required_float("SCORE_WEIGHT_BIN_LIQUIDITY"),
        rebalance_drift_bps=_required_int("REBALANCE_DRIFT_BPS"),
        rebalance_min_fees_usd=_required_float("REBALANCE_MIN_FEES_USD"),
        exit_volatility_24h_pct=_required_float("EXIT_VOLATILITY_24H_PCT"),
        dashboard_port=_required_int("DASHBOARD_PORT"),
        dashboard_host=_required("DASHBOARD_HOST"),
        log_level=_required("LOG_LEVEL"),
        log_file=Path(_required("LOG_FILE")),
    )
    cfg.validate()
    return cfg


CONFIG = load_config() if os.getenv("METEORA_SKIP_CONFIG_LOAD") != "1" else None  # type: ignore
