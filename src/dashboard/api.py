"""
FastAPI dashboard server — read-only endpoints consumed by the Next.js frontend.
Run via: python -m src.main --mode dashboard
"""
from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.config import CONFIG
from src.db import Database
from src.dashboard.auth import router as auth_router
from src.dashboard.admin import router as admin_router


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


# --- Startup / shutdown ---

_db: Database
_wallet_pubkey: str


def _load_pubkey(path: Path) -> str:
    try:
        from solders.keypair import Keypair  # type: ignore
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        return str(Keypair.from_bytes(bytes(raw)).pubkey())
    except Exception:
        return "unknown"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db, _wallet_pubkey
    cfg = CONFIG
    assert cfg is not None, "CONFIG must be loaded to run the dashboard"
    _db = Database(cfg.database_url)
    await _db.connect()
    _wallet_pubkey = _load_pubkey(cfg.hot_wallet_keypair_path)
    yield
    await _db.close()


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
    return KpiSummary(
        openPositions=stats["open_count"],
        dailyFeesUsd=stats["fees_earned"],
        totalDeployedUsd=stats["total_deployed"],
        pnlDayUsd=stats["pnl_day"],
        pnlWeekUsd=stats["pnl_week"],
        maxPositionUsd=cfg.max_position_usd,
        maxTotalDeployedUsd=cfg.max_total_deployed_usd,
        dailyLossLimitPct=cfg.daily_loss_limit_pct,
        dailyLossCurrentPct=stats["daily_loss_pct"],
    )


@app.get("/activity", response_model=list[ActivityItem])
async def get_activity(limit: int = Query(default=20, ge=1, le=200)) -> list[ActivityItem]:
    rows = await _db.get_activity(limit)
    return [ActivityItem(**row) for row in rows]


@app.get("/risk", response_model=RiskUtilization)
async def get_risk() -> RiskUtilization:
    cfg = CONFIG
    assert cfg is not None
    stats = await _db.get_position_stats()

    pos_util = (stats["open_count"] / cfg.max_open_positions * 100) if cfg.max_open_positions > 0 else 0.0
    dep_util = (stats["total_deployed"] / cfg.max_total_deployed_usd * 100) if cfg.max_total_deployed_usd > 0 else 0.0
    loss_pct = stats["daily_loss_pct"]

    if loss_pct >= cfg.daily_loss_limit_pct:
        guard = "tripped"
    elif loss_pct >= cfg.daily_loss_limit_pct * 0.8:
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
        maxPositionUsd=cfg.max_position_usd,
        maxTotalDeployedUsd=cfg.max_total_deployed_usd,
        dailyLossLimitPct=cfg.daily_loss_limit_pct,
        maxOpenPositions=cfg.max_open_positions,
        network=cfg.network,
    )
