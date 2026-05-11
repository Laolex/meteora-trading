"""
Decision engine. Given current position state + market snapshot, returns an Action.

This is the core of the agent. Keep it simple and auditable — every decision logged.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum

from src.discovery.models import PoolSnapshot
from src.position.models import Position

log = logging.getLogger(__name__)


class ActionType(StrEnum):
    HOLD = "hold"
    REBALANCE = "rebalance"
    CLAIM = "claim"
    EXIT = "exit"


@dataclass(frozen=True)
class Action:
    type: ActionType
    reason: str
    new_lower_bin_id: int | None = None
    new_upper_bin_id: int | None = None


@dataclass(frozen=True)
class DecisionContext:
    position: Position
    pool: PoolSnapshot
    volatility_24h_pct: float
    sol_price_usd: float
    current_fees_usd: float

    # Thresholds (from config)
    rebalance_drift_bps: int
    rebalance_min_fees_usd: float
    exit_volatility_24h_pct: float


def decide(ctx: DecisionContext) -> Action:
    """
    Decision tree:
      1. If volatility breach → EXIT (risk-off)
      2. If out of range AND fees > min → REBALANCE
      3. If out of range AND fees <= min → CLAIM (gas-efficient hold)
      4. If in range AND drift > threshold → REBALANCE (recenter)
      5. Else → HOLD
    """
    p = ctx.position

    # 1. Volatility kill switch
    if ctx.volatility_24h_pct >= ctx.exit_volatility_24h_pct:
        return Action(
            type=ActionType.EXIT,
            reason=(
                f"24h volatility {ctx.volatility_24h_pct:.1f}% "
                f">= exit threshold {ctx.exit_volatility_24h_pct}%"
            ),
        )

    in_range = p.is_in_range(ctx.pool.active_bin_id)
    drift_bps = p.drift_bps_from_center(ctx.pool.active_bin_id, ctx.pool.bin_step)

    # 2 & 3. Out of range
    if not in_range:
        if ctx.current_fees_usd >= ctx.rebalance_min_fees_usd:
            new_lower, new_upper = _recenter_range(ctx.pool.active_bin_id, p)
            return Action(
                type=ActionType.REBALANCE,
                reason=(
                    "out of range "
                    f"(active={ctx.pool.active_bin_id}, "
                    f"range={p.lower_bin_id}..{p.upper_bin_id}); "
                    f"fees ${ctx.current_fees_usd:.2f} cover gas"
                ),
                new_lower_bin_id=new_lower,
                new_upper_bin_id=new_upper,
            )
        if ctx.current_fees_usd <= 0:
            return Action(
                type=ActionType.HOLD,
                reason="out of range but no fees accrued yet — skipping claim",
            )
        return Action(
            type=ActionType.CLAIM,
            reason=(
                f"out of range but fees ${ctx.current_fees_usd:.2f} "
                f"below min ${ctx.rebalance_min_fees_usd:.2f}"
            ),
        )

    # 4. In range but drifted
    if drift_bps >= ctx.rebalance_drift_bps and ctx.current_fees_usd >= ctx.rebalance_min_fees_usd:
        new_lower, new_upper = _recenter_range(ctx.pool.active_bin_id, p)
        return Action(
            type=ActionType.REBALANCE,
            reason=f"drift {drift_bps}bps >= threshold {ctx.rebalance_drift_bps}bps",
            new_lower_bin_id=new_lower,
            new_upper_bin_id=new_upper,
        )

    # 5. Hold
    return Action(
        type=ActionType.HOLD,
        reason=f"in range, drift {drift_bps}bps within tolerance",
    )


def compute_volatility_pct(price_now: float, price_24h_ago: float | None) -> float:
    """24h price change magnitude as a percentage. Returns 0.0 if no baseline."""
    if price_24h_ago is None or price_24h_ago <= 0:
        return 0.0
    return abs((price_now - price_24h_ago) / price_24h_ago) * 100.0


def _recenter_range(active_bin_id: int, position: Position) -> tuple[int, int]:
    """Preserve the same bin width, recentered on active bin."""
    half_width = (position.upper_bin_id - position.lower_bin_id) // 2
    return active_bin_id - half_width, active_bin_id + half_width
