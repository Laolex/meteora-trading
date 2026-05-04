from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PoolSnapshot:
    address: str
    name: str  # e.g. "SOL-USDC"
    token_x_mint: str
    token_y_mint: str
    bin_step: int
    base_fee_pct: float
    tvl_usd: float
    volume_24h_usd: float
    fees_24h_usd: float
    current_price: float
    active_bin_id: int

    @property
    def fee_apr(self) -> float:
        """Crude fee APR — fees_24h annualized over TVL."""
        if self.tvl_usd <= 0:
            return 0.0
        return (self.fees_24h_usd * 365) / self.tvl_usd

    @property
    def volume_to_tvl(self) -> float:
        if self.tvl_usd <= 0:
            return 0.0
        return self.volume_24h_usd / self.tvl_usd
