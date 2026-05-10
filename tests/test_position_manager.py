from unittest.mock import AsyncMock

import pytest

from src.position.manager import MeteoraPositionManager, PositionRange, y_only_range


class _DummyRPC:
    async def get_balance(self, pubkey):
        class R:
            value = 1_000_000_000  # 1 SOL in lamports
        return R()


class _DummyWallet:
    def pubkey(self):
        class P:
            def __init__(self):
                self._bytes = b"\x00" * 32
            def to_base58(self):
                return "DummyPubkey11111111111111111111111111111"
        return P()


@pytest.mark.asyncio
async def test_open_position_passes_client_position_id_and_reuses_it_for_position_id(tmp_path):
    manager = MeteoraPositionManager(
        rpc_client=_DummyRPC(),
        wallet=_DummyWallet(),
        node_helper_path=tmp_path / "node-helper.js",
        dry_run=False,
        sol_price_usd=93.0,
    )

    manager._invoke_helper = AsyncMock(return_value={"signature": "SIG_123"})
    # Bypass guardrail (sol economics check) so we test the invoke path
    manager._check_position_sol_viability = AsyncMock(return_value=None)

    result = await manager.open_position(
        pool_address="Pool111111111111111111111111111111111111111",
        pool_name="TEST-POOL",
        amount_x=1.0,
        amount_y=2.0,
        bin_range=PositionRange(lower_bin_id=10, upper_bin_id=20),
    )

    manager._invoke_helper.assert_awaited_once()


    method, params = manager._invoke_helper.await_args.args

    assert method == "openPosition"
    assert "clientPositionId" in params
    assert params["clientPositionId"] == result.position.id
    assert result.tx_signature == "SIG_123"


def testy_only_range_places_all_bins_strictly_below_active():
    """When amount_x=0 the range must not include or exceed active bin so the
    SDK never needs X tokens — all bins are Y-only bins."""
    active = 100
    r = y_only_range(active, width=20)
    assert r.upper_bin_id < active, "upper bin must be strictly below active bin"
    assert r.upper_bin_id - r.lower_bin_id + 1 == 20, "range must span exactly width bins"


def testy_only_range_preserves_width_for_various_inputs():
    for active, width in [(50, 10), (200, 68), (0, 30)]:
        r = y_only_range(active, width=width)
        assert r.upper_bin_id < active
        assert r.upper_bin_id - r.lower_bin_id + 1 == width
