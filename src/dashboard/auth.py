"""
Wallet-based authentication for the Meteora Agent dashboard.

Flow:
  1. GET  /auth/nonce?pubkey=<pk>  → {"nonce": "Sign in to Meteora Agent Dashboard: <uuid>"}
  2. POST /auth/verify  body={pubkey, signature, nonce}  → {"token": "<jwt>"}

Signature is a base58-encoded ed25519 signature produced by a Solana wallet adapter.
JWT is HS256, 1-hour expiry, sub=pubkey.
"""
from __future__ import annotations

import time
import uuid
from typing import Annotated

import base58
import jwt
import nacl.exceptions
import nacl.signing
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from solders.pubkey import Pubkey  # type: ignore

from src.config import CONFIG

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# In-memory nonce store: pubkey -> (nonce_string, expires_at_unix)
# ---------------------------------------------------------------------------
_NONCE_TTL = 120  # seconds
_nonces: dict[str, tuple[str, float]] = {}


def _clean_expired() -> None:
    now = time.time()
    expired = [k for k, (_, exp) in _nonces.items() if now > exp]
    for k in expired:
        del _nonces[k]


# ---------------------------------------------------------------------------
# Ed25519 verification via PyNaCl + solders for pubkey byte decoding
# ---------------------------------------------------------------------------

def _verify_ed25519(pubkey_str: str, message: bytes, signature_bytes: bytes) -> bool:
    try:
        pubkey_bytes = bytes(Pubkey.from_string(pubkey_str))
        verify_key = nacl.signing.VerifyKey(pubkey_bytes)
        verify_key.verify(message, signature_bytes)
        return True
    except (nacl.exceptions.BadSignatureError, Exception):
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def _make_token(pubkey: str) -> str:
    cfg = CONFIG
    assert cfg is not None
    payload = {
        "sub": pubkey,
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, cfg.jwt_secret, algorithm="HS256")


def _decode_token(token: str) -> dict:
    cfg = CONFIG
    assert cfg is not None
    return jwt.decode(token, cfg.jwt_secret, algorithms=["HS256"])


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

_bearer = HTTPBearer()


def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict:
    """FastAPI dependency — validates Bearer JWT, returns decoded payload."""
    try:
        payload = _decode_token(credentials.credentials)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    pubkey: str
    signature: str  # base58-encoded ed25519 signature
    nonce: str


class NonceResponse(BaseModel):
    nonce: str


class TokenResponse(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/nonce", response_model=NonceResponse)
def get_nonce(pubkey: str = Query(..., description="Solana wallet public key (base58)")) -> NonceResponse:
    _clean_expired()

    nonce_str = f"Sign in to Meteora Agent Dashboard: {uuid.uuid4()}"
    _nonces[pubkey] = (nonce_str, time.time() + _NONCE_TTL)
    return NonceResponse(nonce=nonce_str)


@router.post("/verify", response_model=TokenResponse)
def verify_signature(body: VerifyRequest) -> TokenResponse:
    _clean_expired()

    entry = _nonces.get(body.pubkey)
    if entry is None:
        raise HTTPException(status_code=400, detail="Nonce not found or expired — request a new one")

    nonce_str, expires_at = entry
    if time.time() > expires_at:
        del _nonces[body.pubkey]
        raise HTTPException(status_code=400, detail="Nonce expired — request a new one")

    if body.nonce != nonce_str:
        raise HTTPException(status_code=400, detail="Nonce mismatch")

    # Decode base58 signature
    try:
        sig_bytes = base58.b58decode(body.signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature encoding — expected base58")

    message = nonce_str.encode("utf-8")
    if not _verify_ed25519(body.pubkey, message, sig_bytes):
        raise HTTPException(status_code=401, detail="Signature verification failed")

    # Consume the nonce (one-time use)
    del _nonces[body.pubkey]

    return TokenResponse(token=_make_token(body.pubkey))
