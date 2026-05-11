from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.dashboard.auth import require_auth
from src.vault import client as vault_client

router = APIRouter(prefix="/vault", tags=["vault"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class VaultAmountRequest(BaseModel):
    amountUsdc: float


class VaultOpResponse(BaseModel):
    ok: bool
    signature: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/state")
async def vault_state():
    return {"initialized": False, "note": "vault disabled — manual funding only"}


@router.post("/manager-withdraw", response_model=VaultOpResponse)
async def manager_withdraw(
    body: VaultAmountRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> VaultOpResponse:
    if body.amountUsdc <= 0:
        raise HTTPException(status_code=400, detail="amountUsdc must be greater than 0")
    amount_micro = round(body.amountUsdc * 1_000_000)
    try:
        sig = await vault_client.manager_withdraw(amount_micro)
        return VaultOpResponse(ok=True, signature=sig)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/manager-return", response_model=VaultOpResponse)
async def manager_return(
    body: VaultAmountRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> VaultOpResponse:
    if body.amountUsdc <= 0:
        raise HTTPException(status_code=400, detail="amountUsdc must be greater than 0")
    amount_micro = round(body.amountUsdc * 1_000_000)
    try:
        sig = await vault_client.manager_return(amount_micro)
        return VaultOpResponse(ok=True, signature=sig)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
