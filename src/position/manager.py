"""
Position manager — wraps Meteora DLMM SDK calls.

Note: Meteora's official SDK is TypeScript. Two integration options:
  A) Subprocess to a Node.js helper (fastest to ship)
  B) Direct Anchor-style instruction building via solders/anchorpy

V1 uses option A — Node.js helper invoked via subprocess for SDK-heavy ops,
direct Solana RPC calls via solders for state reads. Day 3 task: build the
node-helper/ subdirectory with thin TS wrappers around @meteora-ag/dlmm.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair  # type: ignore
from solders.pubkey import Pubkey    # type: ignore

from src.position.models import Position, PositionStatus

log = logging.getLogger(__name__)


@dataclass
class PositionRange:
    lower_bin_id: int
    upper_bin_id: int


@dataclass
class OpenResult:
    tx_signature: str
    position: Position


class MeteoraPositionManager:
    """
    High-level position operations. Delegates SDK calls to the Node helper.
    """

    def __init__(
        self,
        rpc_client: AsyncClient,
        wallet: Keypair,
        node_helper_path: Path,
        dry_run: bool,
    ) -> None:
        self._rpc = rpc_client
        self._wallet = wallet
        self._helper = node_helper_path
        self._dry_run = dry_run

    async def open_position(
        self,
        pool_address: str,
        pool_name: str,
        amount_x: float,
        amount_y: float,
        bin_range: PositionRange,
    ) -> OpenResult:
        """
        Open a position with liquidity distributed across bin_range.
        Returns OpenResult with tx signature and Position record.
        """
        if self._dry_run:
            log.info(
                "[DRY_RUN] open_position pool=%s range=%d..%d x=%.4f y=%.4f",
                pool_address, bin_range.lower_bin_id, bin_range.upper_bin_id, amount_x, amount_y,
            )
            position = self._build_position(
                pool_address,
                pool_name,
                bin_range,
                amount_x,
                amount_y,
                "DRY_RUN_SIG",
            )
            return OpenResult(
                tx_signature="DRY_RUN_SIG",
                position=position,
            )

        position = self._build_position(pool_address, pool_name, bin_range, amount_x, amount_y, "")

        # Real path: invoke node helper
        result = await self._invoke_helper("openPosition", {
            "poolAddress": pool_address,
            "amountX": amount_x,
            "amountY": amount_y,
            "lowerBinId": bin_range.lower_bin_id,
            "upperBinId": bin_range.upper_bin_id,
            "clientPositionId": position.id,
        })
        sig = result["signature"]
        position.tx_signature_open = sig
        return OpenResult(tx_signature=sig, position=position)

    async def close_position(self, position: Position) -> str:
        """Close fully — withdraw all liquidity + claim fees. Returns tx sig."""
        if self._dry_run:
            log.info("[DRY_RUN] close_position id=%s pool=%s", position.id, position.pool_address)
            return "DRY_RUN_SIG"

        result = await self._invoke_helper("closePosition", {
            "poolAddress": position.pool_address,
            "positionId": position.id,
        })
        return result["signature"]

    async def claim_fees(self, position: Position) -> str:
        if self._dry_run:
            log.info("[DRY_RUN] claim_fees id=%s", position.id)
            return "DRY_RUN_SIG"
        result = await self._invoke_helper("claimFees", {
            "poolAddress": position.pool_address,
            "positionId": position.id,
        })
        return result["signature"]

    async def _invoke_helper(self, method: str, params: dict) -> dict:
        """
        Invoke Node.js helper as subprocess. Helper reads JSON stdin, writes JSON stdout.
        Day 3 task: implement node-helper/index.ts wrapping @meteora-ag/dlmm.
        """
        import asyncio
        proc = await asyncio.create_subprocess_exec(
            "node", str(self._helper),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        payload = json.dumps({"method": method, "params": params}).encode()
        stdout, stderr = await proc.communicate(input=payload)
        if proc.returncode != 0:
            raise RuntimeError(f"Helper failed: {stderr.decode()}")
        return json.loads(stdout.decode())

    @staticmethod
    def _build_position(
        pool_address: str,
        pool_name: str,
        bin_range: PositionRange,
        amount_x: float,
        amount_y: float,
        sig: str,
    ) -> Position:
        return Position(
            id=str(uuid4()),
            pool_address=pool_address,
            pool_name=pool_name,
            lower_bin_id=bin_range.lower_bin_id,
            upper_bin_id=bin_range.upper_bin_id,
            deposited_x=amount_x,
            deposited_y=amount_y,
            deposited_value_usd=0.0,  # filled by caller w/ price
            fees_earned_x=0.0,
            fees_earned_y=0.0,
            fees_earned_usd=0.0,
            opened_at=datetime.now(timezone.utc),
            last_rebalanced_at=None,
            status=PositionStatus.OPEN,
            tx_signature_open=sig,
        )
