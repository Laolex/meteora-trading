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
        Fetch top pools from DLMM datapi.
        API shape is paginated at /pools with response:
        { total, pages, current_page, page_size, data: [...] }
        """
        resp = await self._client.get(
            f"{self._base}/pools",
            params={"page": 1, "page_size": 200, "sort_by": "volume_24h:desc"},
        )
        resp.raise_for_status()
        payload = resp.json()
        raw_pools: list[dict[str, Any]] = payload.get("data", [])
        return [self._parse(p) for p in raw_pools if self._is_valid(p)]

    async def get_pool(self, address: str) -> PoolSnapshot:
        resp = await self._client.get(f"{self._base}/pools/{address}")
        resp.raise_for_status()
        payload = resp.json()
        raw = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
        if not isinstance(raw, dict):
            raise RuntimeError(f"Unexpected pool payload shape for address {address}")
        return self._parse(raw)

    @staticmethod
    def _is_valid(raw: dict[str, Any]) -> bool:
        # Filter degenerates: missing fields, zero TVL, no recent volume
        return (
            raw.get("tvl") is not None
            and float(raw.get("tvl", 0)) > 100  # min $100 TVL
            and raw.get("address") is not None
        )

    @staticmethod
    def _parse(raw: dict[str, Any]) -> PoolSnapshot:
        token_x = raw.get("token_x") or {}
        token_y = raw.get("token_y") or {}
        pool_cfg = raw.get("pool_config") or {}
        volume = raw.get("volume") or {}
        fees = raw.get("fees") or {}
        return PoolSnapshot(
            address=raw["address"],
            name=raw.get("name", ""),
            token_x_mint=token_x.get("address", ""),
            token_y_mint=token_y.get("address", ""),
            bin_step=int(pool_cfg.get("bin_step", 1)),
            base_fee_pct=float(pool_cfg.get("base_fee_pct", 0)),
            tvl_usd=float(raw.get("tvl", 0)),
            volume_24h_usd=float(volume.get("24h", 0)),
            fees_24h_usd=float(fees.get("24h", 0)),
            current_price=float(raw.get("current_price", 0)),
            active_bin_id=int(raw.get("active_bin_id", 0) or 0),
        )
