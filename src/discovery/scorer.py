"""
Pool scoring engine. Composite score from configurable weights.

Score components (each normalized 0..1 across the candidate set):
  1. fees_24h relative to TVL — direct yield signal
  2. volume/TVL ratio — turnover proxy, predicts sustained fees
  3. token quality — penalize new/illiquid token pairs
  4. bin liquidity depth around active bin — execution quality
"""
from __future__ import annotations

from dataclasses import dataclass

from src.discovery.models import PoolSnapshot


@dataclass(frozen=True)
class ScoredPool:
    pool: PoolSnapshot
    score: float
    component_scores: dict[str, float]


@dataclass(frozen=True)
class ScoringWeights:
    fees_24h: float
    volume_tvl: float
    token_quality: float
    bin_liquidity: float


def _normalize(values: list[float]) -> list[float]:
    """Min-max normalize to [0, 1]. All-equal returns all 0.5."""
    if not values:
        return []
    lo, hi = min(values), max(values)
    if hi - lo < 1e-9:
        return [0.5] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


def _token_quality_score(pool: PoolSnapshot) -> float:
    """
    Heuristic placeholder. Extend with:
      - holder count from Helius
      - mint age
      - presence on Jupiter strict list
      - LP-locked %
    For v1: USDC/USDT/SOL pairs get 1.0, everything else 0.5.
    """
    BLUE_CHIPS = {
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  # USDT
        "So11111111111111111111111111111111111111112",   # WSOL
    }
    blue_chip_count = (pool.token_x_mint in BLUE_CHIPS) + (pool.token_y_mint in BLUE_CHIPS)
    if blue_chip_count == 2:
        return 1.0
    if blue_chip_count == 1:
        return 0.7
    return 0.3


def score_pools(pools: list[PoolSnapshot], weights: ScoringWeights) -> list[ScoredPool]:
    """
    Compute composite scores. Returns sorted descending by score.
    """
    if not pools:
        return []

    fee_aprs = [p.fee_apr for p in pools]
    vol_tvls = [p.volume_to_tvl for p in pools]
    token_qualities = [_token_quality_score(p) for p in pools]
    # Bin liquidity placeholder — needs per-pool bin array fetch (TODO day 2)
    bin_liqs = [1.0] * len(pools)

    n_fee = _normalize(fee_aprs)
    n_vol = _normalize(vol_tvls)
    n_tok = _normalize(token_qualities)
    n_bin = _normalize(bin_liqs)

    scored: list[ScoredPool] = []
    for i, p in enumerate(pools):
        components = {
            "fees_24h": n_fee[i],
            "volume_tvl": n_vol[i],
            "token_quality": n_tok[i],
            "bin_liquidity": n_bin[i],
        }
        score = (
            weights.fees_24h * n_fee[i]
            + weights.volume_tvl * n_vol[i]
            + weights.token_quality * n_tok[i]
            + weights.bin_liquidity * n_bin[i]
        )
        scored.append(ScoredPool(pool=p, score=score, component_scores=components))

    return sorted(scored, key=lambda s: s.score, reverse=True)
