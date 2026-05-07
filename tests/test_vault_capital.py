"""Tests for src/vault/capital.py"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_balance(usdc: float) -> dict:
    return {"address": "addr", "solBalance": 1.0, "usdcBalance": usdc, "usdcMint": "mint"}


# Fake rpc and pubkey — the real calls are mocked so these can be stubs
class _FakeRpc:
    pass


class _FakePubkey:
    pass


# ---------------------------------------------------------------------------
# top_up_if_needed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_top_up_no_action_when_sufficient():
    """Does nothing when wallet USDC >= required."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(100.0))),
        patch("src.vault.capital.vault_client.manager_withdraw", new=AsyncMock()) as mock_withdraw,
    ):
        from src.vault.capital import top_up_if_needed
        await top_up_if_needed(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            required_usdc=100.0, dry_run=False,
        )
        mock_withdraw.assert_not_called()


@pytest.mark.asyncio
async def test_top_up_withdraws_deficit():
    """Calls manager_withdraw with the correct micro amount."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(40.0))),
        patch("src.vault.capital.vault_client.manager_withdraw", new=AsyncMock(return_value={"signature": "sig1", "amountMicro": 60_000_000})) as mock_withdraw,
    ):
        from src.vault.capital import top_up_if_needed
        await top_up_if_needed(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            required_usdc=100.0, dry_run=False,
        )
        mock_withdraw.assert_awaited_once_with(60_000_000)


@pytest.mark.asyncio
async def test_top_up_dry_run_no_withdraw():
    """In dry_run=True, logs but does NOT call manager_withdraw."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(10.0))),
        patch("src.vault.capital.vault_client.manager_withdraw", new=AsyncMock()) as mock_withdraw,
    ):
        from src.vault.capital import top_up_if_needed
        await top_up_if_needed(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            required_usdc=100.0, dry_run=True,
        )
        mock_withdraw.assert_not_called()


@pytest.mark.asyncio
async def test_top_up_swallows_exception():
    """Swallows and logs exceptions from manager_withdraw (no crash)."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(0.0))),
        patch("src.vault.capital.vault_client.manager_withdraw", new=AsyncMock(side_effect=RuntimeError("vault down"))),
    ):
        from src.vault.capital import top_up_if_needed
        # Should not raise
        await top_up_if_needed(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            required_usdc=50.0, dry_run=False,
        )


# ---------------------------------------------------------------------------
# sweep_to_vault
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sweep_no_action_when_at_or_below_keep():
    """Does nothing when wallet USDC <= keep_usdc."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(50.0))),
        patch("src.vault.capital.vault_client.manager_return", new=AsyncMock()) as mock_return,
    ):
        from src.vault.capital import sweep_to_vault
        await sweep_to_vault(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            keep_usdc=50.0, dry_run=False,
        )
        mock_return.assert_not_called()


@pytest.mark.asyncio
async def test_sweep_returns_surplus():
    """Calls manager_return with the surplus micro amount."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(130.0))),
        patch("src.vault.capital.vault_client.manager_return", new=AsyncMock(return_value={"signature": "sig2", "amountMicro": 80_000_000})) as mock_return,
    ):
        from src.vault.capital import sweep_to_vault
        await sweep_to_vault(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            keep_usdc=50.0, dry_run=False,
        )
        mock_return.assert_awaited_once_with(80_000_000)


@pytest.mark.asyncio
async def test_sweep_dry_run_no_return():
    """In dry_run=True, logs but does NOT call manager_return."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(200.0))),
        patch("src.vault.capital.vault_client.manager_return", new=AsyncMock()) as mock_return,
    ):
        from src.vault.capital import sweep_to_vault
        await sweep_to_vault(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            keep_usdc=50.0, dry_run=True,
        )
        mock_return.assert_not_called()


@pytest.mark.asyncio
async def test_sweep_swallows_exception():
    """Swallows and logs exceptions from manager_return (no crash)."""
    with (
        patch("src.vault.capital.get_balance", new=AsyncMock(return_value=_make_balance(999.0))),
        patch("src.vault.capital.vault_client.manager_return", new=AsyncMock(side_effect=RuntimeError("vault down"))),
    ):
        from src.vault.capital import sweep_to_vault
        # Should not raise
        await sweep_to_vault(
            rpc=_FakeRpc(), wallet_pubkey=_FakePubkey(), network="devnet",
            keep_usdc=50.0, dry_run=False,
        )
