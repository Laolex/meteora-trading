"""
Safety rails. Enforced BEFORE any tx is sent. Fail-closed by default.

These checks run on every loop iteration. Any failure pauses the agent.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class GuardResult:
    allowed: bool
    reason: str


class SafetyGuard:
    def __init__(
        self,
        max_position_usd: float,
        max_total_deployed_usd: float,
        daily_loss_limit_pct: float,
        kill_switch_file: Path,
    ) -> None:
        self._max_position = max_position_usd
        self._max_total = max_total_deployed_usd
        self._daily_loss_limit = daily_loss_limit_pct
        self._killswitch = kill_switch_file

    def check_kill_switch(self) -> GuardResult:
        if self._killswitch.exists():
            return GuardResult(False, f"kill switch present at {self._killswitch}")
        return GuardResult(True, "ok")

    def check_position_size(self, proposed_usd: float) -> GuardResult:
        if proposed_usd > self._max_position:
            return GuardResult(
                False,
                f"position ${proposed_usd:.2f} exceeds MAX_POSITION_USD ${self._max_position:.2f}",
            )
        return GuardResult(True, "ok")

    def check_total_deployed(self, current_total_usd: float, proposed_add_usd: float) -> GuardResult:
        if current_total_usd + proposed_add_usd > self._max_total:
            projected_total = current_total_usd + proposed_add_usd
            return GuardResult(
                False,
                (
                    f"total ${projected_total:.2f} exceeds "
                    f"MAX_TOTAL_DEPLOYED_USD ${self._max_total:.2f}"
                ),
            )
        return GuardResult(True, "ok")

    def check_daily_pnl(self, day_start_value_usd: float, current_value_usd: float) -> GuardResult:
        if day_start_value_usd <= 0:
            return GuardResult(True, "no baseline yet")
        loss_pct = ((day_start_value_usd - current_value_usd) / day_start_value_usd) * 100
        if loss_pct >= self._daily_loss_limit:
            return GuardResult(
                False,
                f"daily loss {loss_pct:.2f}% >= limit {self._daily_loss_limit}%",
            )
        return GuardResult(True, f"daily PnL {-loss_pct:.2f}%")

    def all_clear(
        self,
        proposed_position_usd: float,
        current_total_usd: float,
        day_start_value_usd: float,
        current_value_usd: float,
    ) -> GuardResult:
        for check in [
            self.check_kill_switch(),
            self.check_position_size(proposed_position_usd),
            self.check_total_deployed(current_total_usd, proposed_position_usd),
            self.check_daily_pnl(day_start_value_usd, current_value_usd),
        ]:
            if not check.allowed:
                log.warning("Safety guard blocked: %s", check.reason)
                return check
        return GuardResult(True, "all clear")
