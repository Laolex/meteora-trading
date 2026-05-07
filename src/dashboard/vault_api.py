from fastapi import APIRouter

from src.vault import client as vault_client

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("/state")
async def vault_state():
    try:
        return await vault_client.get_state()
    except Exception as exc:
        return {"initialized": False, "error": str(exc)}
