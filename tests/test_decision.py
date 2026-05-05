"""
Decision engine tests. Cover every branch of the decision tree.
"""
from __future__ import annotations

from datetime import datetime

from src.discovery.models import PoolSnapshot
from src.position.models import Position, PositionStatus
from src.rebalance.decision import ActionType, DecisionContext, decide


def _pool(active_bin: int = 0, bin_step: int = 25) -> PoolSnapshot:
    return PoolSnapshot(
        address="pool1", name="SOL-USDC",
        token_x_mint="x", token_y_mint="y",
        bin_step=bin_step, base_fee_pct=0.01,
        tvl_usd=100_000, volume_24h_usd=50_000, fees_24h_usd=100,
        current_price=150.0, active_bin_id=active_bin,
    )


def _position(lower: int = -10, upper: int = 10) -> Position:
    return Position(
        id="p1", pool_address="pool1", pool_name="SOL-USDC",
        lower_bin_id=lower, upper_bin_id=upper,
        deposited_x=1.0, deposited_y=150.0, deposited_value_usd=300,
        fees_earned_x=0.0, fees_earned_y=0.0, fees_earned_usd=0.0,
        opened_at=datetime.utcnow(), last_rebalanced_at=None,
        status=PositionStatus.OPEN, tx_signature_open="sig",
    )


def _ctx(
    position: Position,
    pool: PoolSnapshot,
    vol_pct: float = 5.0,
    fees_usd: float = 1.0,
) -> DecisionContext:
    return DecisionContext(
        position=position, pool=pool,
        volatility_24h_pct=vol_pct, sol_price_usd=150.0, current_fees_usd=fees_usd,
        rebalance_drift_bps=50, rebalance_min_fees_usd=0.10, exit_volatility_24h_pct=30.0,
    )


def test_volatility_breach_exits():
    action = decide(_ctx(_position(), _pool(active_bin=0), vol_pct=35.0))
    assert action.type == ActionType.EXIT


def test_in_range_low_drift_holds():
    # active_bin=0, range -10..10, center=0, drift=0
    action = decide(_ctx(_position(), _pool(active_bin=0)))
    assert action.type == ActionType.HOLD


def test_out_of_range_with_fees_rebalances():
    # active_bin=20, range -10..10 → out of range; fees $1 > min $0.10
    action = decide(_ctx(_position(), _pool(active_bin=20)))
    assert action.type == ActionType.REBALANCE
    assert action.new_lower_bin_id == 10
    assert action.new_upper_bin_id == 30


def test_out_of_range_no_fees_claims():
    # out of range but fees below min → claim only
    action = decide(_ctx(_position(), _pool(active_bin=20), fees_usd=0.01))
    assert action.type == ActionType.CLAIM


def test_in_range_high_drift_rebalances():
    # active_bin=8, range -10..10, center=0, bin_step=25 → drift = 8*25 = 200bps > 50bps
    action = decide(_ctx(_position(), _pool(active_bin=8)))
    assert action.type == ActionType.REBALANCE


def test_recenter_preserves_width():
    # range -10..10 width=20, half=10. Recenter on bin 50 → 40..60
    action = decide(_ctx(_position(lower=-10, upper=10), _pool(active_bin=50)))
    assert action.type == ActionType.REBALANCE
    assert action.new_lower_bin_id == 40
    assert action.new_upper_bin_id == 60
