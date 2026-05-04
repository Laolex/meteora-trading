import pytest
from unittest.mock import AsyncMock

from src.position.manager import MeteoraPositionManager, PositionRange


class _DummyRPC:
    pass


class _DummyWallet:
    pass


@pytest.mark.asyncio
async def test_open_position_passes_client_position_id_and_reuses_it_for_position_id(tmp_path):
    manager = MeteoraPositionManager(
        rpc_client=_DummyRPC(),
        wallet=_DummyWallet(),
        node_helper_path=tmp_path / "node-helper.js",
        dry_run=False,
    )

    manager._invoke_helper = AsyncMock(return_value={"signature": "SIG_123"})

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
