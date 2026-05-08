"""
Adaptive range sizing. Widens the position bin range when volatility is high
(reduce IL / stay-in-range risk) and tightens it when vol is low (concentrate
liquidity to earn more fees per dollar deployed).

Formula:  width = base_width * (vol / reference_vol)
Clamped to [min_bins, max_bins] and rounded to the nearest even number so the
range stays symmetric around the active bin.
"""
from __future__ import annotations


def adaptive_range_bins(
    base_width: int,
    volatility_24h_pct: float,
    *,
    reference_vol_pct: float = 5.0,
    min_bins: int = 10,
    max_bins: int = 120,
) -> int:
    """Return a bin-width adapted to current market volatility."""
    if volatility_24h_pct <= 0 or reference_vol_pct <= 0:
        return base_width

    ratio = volatility_24h_pct / reference_vol_pct
    raw = round(base_width * ratio)
    raw = max(min_bins, min(max_bins, raw))
    # Even number → symmetric lower/upper halves
    return raw if raw % 2 == 0 else raw + 1
