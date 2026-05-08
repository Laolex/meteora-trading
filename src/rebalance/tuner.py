"""
LLM-powered parameter tuner. Calls Claude once per hour with the current
market regime and receives adjusted rebalance thresholds back as JSON.

Falls back to config defaults silently on any error — the main loop is never
blocked by an LLM call failing.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

import anthropic

log = logging.getLogger(__name__)

_PROMPT = """\
You are tuning parameters for an autonomous Meteora DLMM liquidity position \
manager on Solana.

Current market state:
- Pool: {pool_name}
- 24h price volatility: {volatility_24h_pct:.1f}%
- Fee APR: {fee_apr:.1f}%
- Current position drift from center: {drift_bps} bps
- Position out of range: {out_of_range}
- Rebalances executed today: {rebalance_count}

Active thresholds:
- rebalance_drift_bps: {drift_bps_cfg}  (trigger rebalance when drift exceeds this)
- exit_volatility_24h_pct: {exit_vol_cfg}  (exit position when 24h vol exceeds this)

Return ONLY a JSON object — no markdown, no explanation outside the JSON:
{{
  "rebalance_drift_bps": <integer 25–200>,
  "exit_volatility_24h_pct": <float 15.0–60.0>,
  "reasoning": "<one concise sentence>"
}}

Tuning heuristics:
- High vol regime (>15%): widen exit threshold, loosen drift tolerance.
- Low vol regime (<3%): tighten drift threshold to maximise fee capture.
- Frequent rebalancing (>5 today): loosen drift threshold to reduce churn.
- High fee APR (>100%): aggressively stay in range, tighten drift threshold.
"""


@dataclass
class TunedParams:
    rebalance_drift_bps: int
    exit_volatility_24h_pct: float
    reasoning: str
    tuned_at: datetime


class LLMTuner:
    def __init__(
        self,
        api_key: str,
        tune_interval_seconds: int = 3600,
        model: str = "claude-haiku-4-5-20251001",
    ) -> None:
        self._client = anthropic.Anthropic(api_key=api_key)
        self._interval = timedelta(seconds=tune_interval_seconds)
        self._model = model
        self._last_tuned: datetime | None = None
        self._cached: TunedParams | None = None

    @property
    def cached(self) -> TunedParams | None:
        return self._cached

    def due(self) -> bool:
        if self._last_tuned is None:
            return True
        return datetime.utcnow() - self._last_tuned >= self._interval

    def tune(
        self,
        *,
        pool_name: str,
        volatility_24h_pct: float,
        fee_apr: float,
        drift_bps: int,
        out_of_range: bool,
        rebalance_count: int,
        default_drift_bps: int,
        default_exit_vol_pct: float,
    ) -> TunedParams:
        """Call Claude and return adjusted thresholds. Always returns a result."""
        prompt = _PROMPT.format(
            pool_name=pool_name,
            volatility_24h_pct=volatility_24h_pct,
            fee_apr=fee_apr * 100,
            drift_bps=drift_bps,
            out_of_range=out_of_range,
            rebalance_count=rebalance_count,
            drift_bps_cfg=default_drift_bps,
            exit_vol_cfg=default_exit_vol_pct,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()
            data = json.loads(text)
            params = TunedParams(
                rebalance_drift_bps=int(data["rebalance_drift_bps"]),
                exit_volatility_24h_pct=float(data["exit_volatility_24h_pct"]),
                reasoning=str(data["reasoning"]),
                tuned_at=datetime.utcnow(),
            )
            self._cached = params
            self._last_tuned = datetime.utcnow()
            log.info(
                "LLM tuned — drift=%dbps exit_vol=%.1f%% | %s",
                params.rebalance_drift_bps,
                params.exit_volatility_24h_pct,
                params.reasoning,
            )
            return params
        except Exception as exc:
            log.warning("LLM tuning failed (%s) — using config defaults", exc)
            fallback = TunedParams(
                rebalance_drift_bps=default_drift_bps,
                exit_volatility_24h_pct=default_exit_vol_pct,
                reasoning="LLM unavailable — config defaults active",
                tuned_at=datetime.utcnow(),
            )
            self._cached = fallback
            self._last_tuned = datetime.utcnow()
            return fallback
