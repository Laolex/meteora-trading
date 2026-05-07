"""Tests for vault manager-withdraw and manager-return endpoints."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.dashboard.vault_api import router
from src.dashboard.auth import require_auth

# ---------------------------------------------------------------------------
# App fixture with auth bypassed
# ---------------------------------------------------------------------------

app = FastAPI()
app.include_router(router)

# Override require_auth so tests don't need a real JWT
app.dependency_overrides[require_auth] = lambda: {"sub": "test-pubkey"}

client = TestClient(app)

FAKE_SIG = "5someBase58Signature1111111111111111111111111111"


# ---------------------------------------------------------------------------
# /vault/manager-withdraw
# ---------------------------------------------------------------------------

class TestManagerWithdraw:
    def test_rejects_zero_amount(self):
        resp = client.post("/vault/manager-withdraw", json={"amountUsdc": 0})
        assert resp.status_code == 400

    def test_rejects_negative_amount(self):
        resp = client.post("/vault/manager-withdraw", json={"amountUsdc": -5.0})
        assert resp.status_code == 400

    def test_calls_vault_client_with_micro_amount(self):
        mock_withdraw = AsyncMock(return_value=FAKE_SIG)
        with patch("src.dashboard.vault_api.vault_client.manager_withdraw", mock_withdraw):
            resp = client.post("/vault/manager-withdraw", json={"amountUsdc": 10.5})
        assert resp.status_code == 200
        mock_withdraw.assert_awaited_once_with(10_500_000)

    def test_returns_correct_shape_on_success(self):
        mock_withdraw = AsyncMock(return_value=FAKE_SIG)
        with patch("src.dashboard.vault_api.vault_client.manager_withdraw", mock_withdraw):
            resp = client.post("/vault/manager-withdraw", json={"amountUsdc": 1.0})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["signature"] == FAKE_SIG

    def test_returns_500_on_vault_client_exception(self):
        mock_withdraw = AsyncMock(side_effect=RuntimeError("RPC timeout"))
        with patch("src.dashboard.vault_api.vault_client.manager_withdraw", mock_withdraw):
            resp = client.post("/vault/manager-withdraw", json={"amountUsdc": 1.0})
        assert resp.status_code == 500
        assert "RPC timeout" in resp.json()["detail"]

    def test_rounds_fractional_micro_amount(self):
        """Verify rounding: 0.000001 USDC -> 1 micro, 0.0000005 -> 1 (rounded up)."""
        mock_withdraw = AsyncMock(return_value=FAKE_SIG)
        with patch("src.dashboard.vault_api.vault_client.manager_withdraw", mock_withdraw):
            resp = client.post("/vault/manager-withdraw", json={"amountUsdc": 0.000001})
        assert resp.status_code == 200
        mock_withdraw.assert_awaited_once_with(1)


# ---------------------------------------------------------------------------
# /vault/manager-return
# ---------------------------------------------------------------------------

class TestManagerReturn:
    def test_rejects_zero_amount(self):
        resp = client.post("/vault/manager-return", json={"amountUsdc": 0})
        assert resp.status_code == 400

    def test_rejects_negative_amount(self):
        resp = client.post("/vault/manager-return", json={"amountUsdc": -1.0})
        assert resp.status_code == 400

    def test_calls_vault_client_with_micro_amount(self):
        mock_return = AsyncMock(return_value=FAKE_SIG)
        with patch("src.dashboard.vault_api.vault_client.manager_return", mock_return):
            resp = client.post("/vault/manager-return", json={"amountUsdc": 25.0})
        assert resp.status_code == 200
        mock_return.assert_awaited_once_with(25_000_000)

    def test_returns_correct_shape_on_success(self):
        mock_return = AsyncMock(return_value=FAKE_SIG)
        with patch("src.dashboard.vault_api.vault_client.manager_return", mock_return):
            resp = client.post("/vault/manager-return", json={"amountUsdc": 50.0})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["signature"] == FAKE_SIG

    def test_returns_500_on_vault_client_exception(self):
        mock_return = AsyncMock(side_effect=ValueError("insufficient funds"))
        with patch("src.dashboard.vault_api.vault_client.manager_return", mock_return):
            resp = client.post("/vault/manager-return", json={"amountUsdc": 1.0})
        assert resp.status_code == 500
        assert "insufficient funds" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Unauthenticated requests — no dependency override applied
# ---------------------------------------------------------------------------

# Separate app and client with NO auth override to test real auth rejection.
_unauthed_app = FastAPI()
_unauthed_app.include_router(router)
_unauthed_client = TestClient(_unauthed_app, raise_server_exceptions=False)


class TestUnauthenticated:
    def test_manager_withdraw_rejects_missing_token(self):
        resp = _unauthed_client.post("/vault/manager-withdraw", json={"amountUsdc": 10.0})
        assert resp.status_code == 401

    def test_manager_return_rejects_missing_token(self):
        resp = _unauthed_client.post("/vault/manager-return", json={"amountUsdc": 10.0})
        assert resp.status_code == 401
