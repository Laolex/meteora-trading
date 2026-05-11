"""Tests for LLM parameter tuner — mocks the Anthropic client."""
import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from src.rebalance.tuner import LLMTuner, TunedParams


def _make_tuner() -> LLMTuner:
    return LLMTuner(api_key="test-key", tune_interval_seconds=3600)


def _mock_response(drift_bps: int, exit_vol: float, reasoning: str):
    payload = json.dumps({
        "rebalance_drift_bps": drift_bps,
        "exit_volatility_24h_pct": exit_vol,
        "reasoning": reasoning,
    })
    msg = MagicMock()
    msg.content = [MagicMock(text=payload)]
    return msg


def test_due_on_first_call():
    tuner = _make_tuner()
    assert tuner.due() is True


def test_not_due_after_tune():
    tuner = _make_tuner()
    with patch.object(tuner._client.messages, "create", return_value=_mock_response(75, 35.0, "ok")):
        tuner.tune(
            pool_name="SOL-USDC", volatility_24h_pct=5.0, fee_apr=0.5,
            drift_bps=30, out_of_range=False, rebalance_count=1,
            default_drift_bps=50, default_exit_vol_pct=30.0,
        )
    assert tuner.due() is False


def test_tune_returns_llm_values():
    tuner = _make_tuner()
    with patch.object(tuner._client.messages, "create", return_value=_mock_response(80, 40.0, "high vol")):
        result = tuner.tune(
            pool_name="SOL-USDC", volatility_24h_pct=12.0, fee_apr=1.2,
            drift_bps=100, out_of_range=True, rebalance_count=3,
            default_drift_bps=50, default_exit_vol_pct=30.0,
        )
    assert result.rebalance_drift_bps == 80
    assert result.exit_volatility_24h_pct == pytest.approx(40.0)
    assert "high vol" in result.reasoning


def test_tune_falls_back_on_api_error():
    tuner = _make_tuner()
    with patch.object(tuner._client.messages, "create", side_effect=Exception("network error")):
        result = tuner.tune(
            pool_name="SOL-USDC", volatility_24h_pct=5.0, fee_apr=0.5,
            drift_bps=30, out_of_range=False, rebalance_count=0,
            default_drift_bps=50, default_exit_vol_pct=30.0,
        )
    assert result.rebalance_drift_bps == 50
    assert result.exit_volatility_24h_pct == pytest.approx(30.0)


def test_cached_is_none_initially():
    assert _make_tuner().cached is None


def test_cached_after_tune():
    tuner = _make_tuner()
    with patch.object(tuner._client.messages, "create", return_value=_mock_response(60, 25.0, "low vol")):
        tuner.tune(
            pool_name="SOL-USDC", volatility_24h_pct=2.0, fee_apr=0.8,
            drift_bps=10, out_of_range=False, rebalance_count=0,
            default_drift_bps=50, default_exit_vol_pct=30.0,
        )
    assert tuner.cached is not None
    assert tuner.cached.rebalance_drift_bps == 60
