"""
Meteora DLMM API client. Pulls pool universe and per-pool metrics.

API docs: https://dlmm-api.meteora.ag/swagger-ui/
"""
from __future__ import annotations

from typing import Any

import httpx
from src.discovery.models import PoolSnapshot


class MeteoraClient:
    def __init__(self, base_url: str, timeout: float = 15.0) -> None:
        self._base = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    async def list_all_pools(self) -> list[PoolSnapshot]:
        """
        Fetch full pool list. Meteora paginates — handle that here.
        """
        resp = await self._client.get(f"{self._base}/pair/all")
        resp.raise_for_status()
        raw_pools: list[dict[str, Any]] = resp.json()
        return [self._parse(p) for p in raw_pools if self._is_valid(p)]

    async def get_pool(self, address: str) -> PoolSnapshot:
        resp = await self._client.get(f"{self._base}/pair/{address}")
        resp.raise_for_status()
        return self._parse(resp.json())

    @staticmethod
    def _is_valid(raw: dict[str, Any]) -> bool:
        # Filter degenerates: missing fields, zero TVL, no recent volume
        return (
            raw.get("liquidity") is not None
            and float(raw.get("liquidity", 0)) > 100  # min $100 TVL
            and raw.get("address") is not None
        )

    @staticmethod
    def _parse(raw: dict[str, Any]) -> PoolSnapshot:
        return PoolSnapshot(
            address=raw["address"],
            name=raw.get("name", ""),
            token_x_mint=raw["mint_x"],
            token_y_mint=raw["mint_y"],
            bin_step=int(raw["bin_step"]),
            base_fee_pct=float(raw.get("base_fee_percentage", 0)),
            tvl_usd=float(raw.get("liquidity", 0)),
            volume_24h_usd=float(raw.get("trade_volume_24h", 0)),
            fees_24h_usd=float(raw.get("fees_24h", 0)),
            current_price=float(raw.get("current_price", 0)),
            active_bin_id=int(raw.get("active_id", 0)),
        )
