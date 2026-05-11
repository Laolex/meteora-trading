"""Tests for pool scoring — TVL floor and volume/TVL cap."""
from src.discovery.models import PoolSnapshot
from src.discovery.scorer import ScoringWeights, score_pools

USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
JUNK = "JuNkMiNt11111111111111111111111111111111111"

WEIGHTS = ScoringWeights(fees_24h=0.4, volume_tvl=0.3, token_quality=0.2, bin_liquidity=0.1)


def _pool(address="P1", tvl=100_000.0, vol=10_000.0, fees=500.0, x=USDC, y=USDT) -> PoolSnapshot:
    return PoolSnapshot(
        address=address, name="TEST", token_x_mint=x, token_y_mint=y,
        bin_step=10, base_fee_pct=0.1, tvl_usd=tvl, volume_24h_usd=vol,
        fees_24h_usd=fees, current_price=1.0, active_bin_id=0,
    )


def test_thin_pool_excluded_by_tvl_floor():
    """Pool with $1.28 TVL must never be selected even if it has huge volume."""
    thin = _pool("thin", tvl=1.28, vol=424_000.0, fees=3258.0, x=JUNK, y=USDT)
    healthy = _pool("healthy", tvl=200_000.0, vol=50_000.0, fees=1000.0)
    result = score_pools([thin, healthy], WEIGHTS, min_tvl_usd=50_000.0)
    addresses = [r.pool.address for r in result]
    assert "thin" not in addresses
    assert "healthy" in addresses


def test_pools_below_tvl_floor_all_excluded():
    """Every pool below the floor is dropped regardless of other metrics."""
    pools = [_pool(str(i), tvl=float(i * 100)) for i in range(1, 6)]  # $100–$500 TVL
    result = score_pools(pools, WEIGHTS, min_tvl_usd=1_000.0)
    assert result == []


def test_tvl_floor_default_is_50k():
    """Default min_tvl_usd must be high enough to block thin pools."""
    thin = _pool("thin", tvl=10_000.0, vol=999_999.0, fees=9999.0)
    healthy = _pool("healthy", tvl=75_000.0, vol=10_000.0, fees=200.0)
    result = score_pools([thin, healthy], WEIGHTS)
    addresses = [r.pool.address for r in result]
    assert "thin" not in addresses


def test_vol_tvl_cap_prevents_thin_pool_dominating_score():
    """A pool with volume/TVL=330000x must not outscore a healthy pool after capping."""
    # Even if thin pool sneaks past TVL floor, its vol/TVL ratio must be capped
    whale = _pool("whale", tvl=100_000.0, vol=330_000_000.0, fees=100.0)  # 3300x ratio
    healthy = _pool("healthy", tvl=100_000.0, vol=200_000.0, fees=5000.0)  # 2x ratio, better fees
    result = score_pools([whale, healthy], WEIGHTS, min_tvl_usd=0.0, max_vol_tvl_ratio=20.0)
    assert result[0].pool.address == "healthy", (
        f"healthy should outscore whale after vol/tvl cap, got: {[r.pool.address for r in result]}"
    )


def test_vol_tvl_cap_default_is_reasonable():
    """Default cap must prevent extreme outliers from dominating."""
    extreme = _pool("extreme", tvl=100_000.0, vol=10_000_000_000.0, fees=1.0)  # 100,000x
    good = _pool("good", tvl=100_000.0, vol=300_000.0, fees=10_000.0)
    result = score_pools([extreme, good], WEIGHTS)
    assert result[0].pool.address == "good"
