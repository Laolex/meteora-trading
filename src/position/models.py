"""
Position state — what the agent is currently holding.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class PositionStatus(StrEnum):
    OPEN = "open"
    REBALANCING = "rebalancing"
    EXITING = "exiting"
    CLOSED = "closed"


@dataclass
class Position:
    id: str                          # uuid
    pool_address: str
    pool_name: str
    lower_bin_id: int
    upper_bin_id: int
    deposited_x: float               # token X amount
    deposited_y: float               # token Y amount
    deposited_value_usd: float
    fees_earned_x: float
    fees_earned_y: float
    fees_earned_usd: float
    opened_at: datetime
    last_rebalanced_at: datetime | None
    status: PositionStatus
    tx_signature_open: str

    @property
    def position_center_bin(self) -> int:
        return (self.lower_bin_id + self.upper_bin_id) // 2

    def is_in_range(self, active_bin_id: int) -> bool:
        return self.lower_bin_id <= active_bin_id <= self.upper_bin_id

    def drift_bps_from_center(self, active_bin_id: int, bin_step: int) -> int:
        """Distance from active bin to position center, expressed in basis points."""
        return abs(active_bin_id - self.position_center_bin) * bin_step
