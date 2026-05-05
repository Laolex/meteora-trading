"""
Admin endpoints for the Meteora Agent dashboard.
All routes are protected by JWT auth (require_auth dependency).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.config import CONFIG
from src.dashboard.auth import require_auth

router = APIRouter(prefix="/admin", tags=["admin"])


class KillSwitchRequest(BaseModel):
    arm: bool


class KillSwitchResponse(BaseModel):
    ok: bool
    armed: bool


@router.post("/kill-switch", response_model=KillSwitchResponse)
def set_kill_switch(
    body: KillSwitchRequest,
    _auth: Annotated[dict, Depends(require_auth)],
) -> KillSwitchResponse:
    """
    Arm (create) or disarm (delete) the kill-switch file.
    Requires a valid Bearer JWT from /auth/verify.
    """
    cfg = CONFIG
    assert cfg is not None

    ks_path = cfg.kill_switch_file

    if body.arm:
        ks_path.touch(exist_ok=True)
    else:
        if ks_path.exists():
            ks_path.unlink()

    armed = ks_path.exists()
    return KillSwitchResponse(ok=True, armed=armed)
