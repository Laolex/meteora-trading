"""
Admin endpoints for the Meteora Agent dashboard.
All routes are protected by JWT auth (require_auth dependency).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.config import CONFIG, RUNTIME_OVERRIDES
from src.dashboard.auth import require_auth
from src.dashboard.wallet import get_balance, withdraw as withdraw_funds

_RUNTIME_CONFIG_FILE = Path("/opt/meteora-agent/var/runtime-config.json")
_LLM_KEY_FILE = Path("/opt/meteora-agent/var/anthropic-key.txt")

router = APIRouter(prefix="/admin", tags=["admin"])


class KillSwitchRequest(BaseModel):
    arm: bool


class KillSwitchResponse(BaseModel):
    ok: bool
    armed: bool


class WithdrawRequest(BaseModel):
    amountSol: float
    amountUsdc: float


class WithdrawResponse(BaseModel):
    ok: bool
    txSignature: str


@router.post("/kill-switch", response_model=KillSwitchResponse)
def set_kill_switch(
    body: KillSwitchRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> KillSwitchResponse:
    cfg = CONFIG
    assert cfg is not None
    ks_path = cfg.kill_switch_file
    if body.arm:
        ks_path.touch(exist_ok=True)
    else:
        if ks_path.exists():
            ks_path.unlink()
    return KillSwitchResponse(ok=True, armed=ks_path.exists())


class LlmToggleRequest(BaseModel):
    enable: bool


class LlmToggleResponse(BaseModel):
    ok: bool
    enabled: bool


@router.post("/llm-toggle", response_model=LlmToggleResponse)
def set_llm_toggle(
    body: LlmToggleRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> LlmToggleResponse:
    cfg = CONFIG
    assert cfg is not None
    disabled_path = cfg.llm_disabled_file
    if body.enable:
        if disabled_path.exists():
            disabled_path.unlink()
    else:
        disabled_path.touch(exist_ok=True)
    return LlmToggleResponse(ok=True, enabled=not disabled_path.exists())


class UpdateConfigRequest(BaseModel):
    maxPositionUsd: float | None = None
    maxTotalDeployedUsd: float | None = None
    dailyLossPct: float | None = None


class UpdateConfigResponse(BaseModel):
    ok: bool


@router.post("/config", response_model=UpdateConfigResponse)
def update_config(
    body: UpdateConfigRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> UpdateConfigResponse:
    _RUNTIME_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing: dict = {}
    if _RUNTIME_CONFIG_FILE.exists():
        try:
            existing = json.loads(_RUNTIME_CONFIG_FILE.read_text())
        except Exception:
            pass
    if body.maxPositionUsd is not None:
        existing["max_position_usd"] = body.maxPositionUsd
        RUNTIME_OVERRIDES["max_position_usd"] = body.maxPositionUsd
    if body.maxTotalDeployedUsd is not None:
        existing["max_total_deployed_usd"] = body.maxTotalDeployedUsd
        RUNTIME_OVERRIDES["max_total_deployed_usd"] = body.maxTotalDeployedUsd
    if body.dailyLossPct is not None:
        existing["daily_loss_limit_pct"] = body.dailyLossPct
        RUNTIME_OVERRIDES["daily_loss_limit_pct"] = body.dailyLossPct
    _RUNTIME_CONFIG_FILE.write_text(json.dumps(existing, indent=2))
    return UpdateConfigResponse(ok=True)


_OPENAI_KEY_FILE = Path("/opt/meteora-agent/var/openai-key.txt")


class SetLlmKeyRequest(BaseModel):
    apiKey: str
    provider: str = "anthropic"  # "anthropic" | "openai"


class SetLlmKeyResponse(BaseModel):
    ok: bool
    provider: str


@router.post("/llm-key", response_model=SetLlmKeyResponse)
def set_llm_key(
    body: SetLlmKeyRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> SetLlmKeyResponse:
    key = body.apiKey.strip()
    provider = body.provider.lower()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    if provider not in ("anthropic", "openai"):
        raise HTTPException(status_code=400, detail="provider must be 'anthropic' or 'openai'")
    _LLM_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if provider == "anthropic":
        _LLM_KEY_FILE.write_text(key)
        os.environ["ANTHROPIC_API_KEY"] = key
    else:
        _OPENAI_KEY_FILE.write_text(key)
        os.environ["OPENAI_API_KEY"] = key
    return SetLlmKeyResponse(ok=True, provider=provider)


@router.post("/withdraw", response_model=WithdrawResponse)
async def withdraw(
    body: WithdrawRequest,
    request: Request,
    _auth: Annotated[dict, Depends(require_auth)],
) -> WithdrawResponse:
    cfg = CONFIG
    assert cfg is not None

    if body.amountSol < 0 or body.amountUsdc < 0:
        raise HTTPException(status_code=400, detail="Amounts must be non-negative")

    balance = await get_balance(request.app.state.rpc, request.app.state.wallet_keypair.pubkey(), cfg.network)
    max_sol = max(0.0, balance["solBalance"] - 0.01)
    if body.amountSol > max_sol:
        raise HTTPException(status_code=400, detail=f"Insufficient SOL balance (max withdrawable: {max_sol:.4f})")
    if body.amountUsdc > balance["usdcBalance"]:
        raise HTTPException(status_code=400, detail=f"Insufficient USDC balance ({balance['usdcBalance']:.2f} available)")

    try:
        sig = await withdraw_funds(
            rpc=request.app.state.rpc,
            wallet=request.app.state.wallet_keypair,
            authorized_pubkey=cfg.authorized_pubkey,
            amount_sol=body.amountSol,
            amount_usdc=body.amountUsdc,
            dry_run=cfg.dry_run,
            network=cfg.network,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return WithdrawResponse(ok=True, txSignature=sig)
