"""
Admin endpoints for the Meteora Agent dashboard.
All routes are protected by JWT auth (require_auth dependency).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.config import CONFIG
from src.dashboard.auth import require_auth
from src.dashboard.wallet import get_balance, withdraw as withdraw_funds

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
