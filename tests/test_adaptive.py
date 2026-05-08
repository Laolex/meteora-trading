"""Tests for adaptive range sizing."""
import pytest
from src.rebalance.adaptive import adaptive_range_bins


def test_at_reference_vol_returns_base():
    assert adaptive_range_bins(40, 5.0, reference_vol_pct=5.0) == 40


def test_low_vol_tightens_range():
    result = adaptive_range_bins(40, 2.5, reference_vol_pct=5.0)
    assert result < 40
    assert result >= 10  # min_bins floor


def test_high_vol_widens_range():
    result = adaptive_range_bins(40, 15.0, reference_vol_pct=5.0)
    assert result > 40
    assert result <= 120  # max_bins ceiling


def test_result_is_always_even():
    for vol in [1.0, 3.0, 7.0, 11.0, 22.0]:
        result = adaptive_range_bins(40, vol, reference_vol_pct=5.0)
        assert result % 2 == 0, f"odd result {result} for vol={vol}"


def test_zero_vol_returns_base():
    assert adaptive_range_bins(40, 0.0) == 40


def test_min_clamp():
    # Extremely low vol should not go below min_bins
    result = adaptive_range_bins(40, 0.1, reference_vol_pct=5.0, min_bins=10)
    assert result >= 10


def test_max_clamp():
    # Extremely high vol should not exceed max_bins
    result = adaptive_range_bins(40, 200.0, reference_vol_pct=5.0, max_bins=120)
    assert result <= 120


def test_custom_reference_vol():
    # With reference_vol=10, vol=10 should return base_width
    result = adaptive_range_bins(60, 10.0, reference_vol_pct=10.0)
    assert result == 60
