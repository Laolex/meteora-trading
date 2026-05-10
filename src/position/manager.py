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
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair  # type: ignore

from src.position.models import Position, PositionStatus

log = logging.getLogger(__name__)


@dataclass
class PositionRange:
    lower_bin_id: int
    upper_bin_id: int


def y_only_range(active_bin_id: int, width: int) -> PositionRange:
    """Return a range of `width` bins strictly below the active bin.

    All bins in this range are Y-token bins in Meteora DLMM, so a deposit
    with totalXAmount=0 will work correctly without the SDK zeroing both sides.
    """
    return PositionRange(
        lower_bin_id=active_bin_id - width,
        upper_bin_id=active_bin_id - 1,
    )


@dataclass
class OpenResult:
    tx_signature: str
    position: Position
    error: str | None = None  # set when guardrails blocked the open


class MeteoraPositionManager:
    """
    High-level position operations. Delegates SDK calls to the Node helper.
    """

    # ── constants for SOL economics ────────────────────────────────────────
    SOL_RENT_PER_BIN_ARRAY: float = 0.072   # SOL cost per 10240-byte account (rent exempt min)
    TX_FEE_BUFFER_SOL: float = 0.050         # buffer for tx fees + unforeseen costs
    MIN_SOL_WALLET: float = 0.25            # do NOT attempt positions below this balance
    MIN_RENT_COVERAGE_MULTIPLIER: float = 2.0  # position USD must be ≥ this × bin array rent in USD

    def __init__(
        self,
        rpc_client: AsyncClient,
        wallet: Keypair,
        node_helper_path: Path,
        dry_run: bool,
        sol_price_usd: float = 93.0,  # injected for testability; production resolves via oracle
    ) -> None:
        self._rpc = rpc_client
        self._wallet = wallet
        self._helper = node_helper_path
        self._dry_run = dry_run
        self._sol_price_usd = sol_price_usd

    def _num_bin_arrays_estimate(self, bin_range: PositionRange) -> int:
        """Estimate how many bin array accounts a position will need."""
        spread = bin_range.upper_bin_id - bin_range.lower_bin_id + 1
        # DLMM creates one bin array per ~25 bins (8192 bytes each at minimum)
        # Conservative: round up to nearest multiple of 25
        return max(3, (spread + 24) // 25)

    async def _get_wallet_sol_balance(self) -> float:
        resp = await self._rpc.get_balance(self._wallet.pubkey())
        return resp.value / 1e9

    async def _check_position_sol_viability(
        self, amount_y_usd: float, bin_range: PositionRange
    ) -> str | None:
        """
        Returns None if OK, or an error reason string if the position is unviable.
        Checks two things:
          1. Position size covers bin array rent (SOL economics)
          2. Wallet has enough SOL to pay rent + fees
        """
        n_bins = self._num_bin_arrays_estimate(bin_range)
        rent_sol = n_bins * self.SOL_RENT_PER_BIN_ARRAY
        total_sol_needed = rent_sol + self.TX_FEE_BUFFER_SOL

        # ── check 1: SOL wallet balance ──────────────────────────────────
        wallet_sol = await self._get_wallet_sol_balance()
        if wallet_sol < total_sol_needed:
            return (
                f"wallet SOL {wallet_sol:.4f} < required {total_sol_needed:.4f} "
                f"({n_bins} bins × {self.SOL_RENT_PER_BIN_ARRAY} + {self.TX_FEE_BUFFER_SOL} buffer)"
            )
        if wallet_sol < self.MIN_SOL_WALLET:
            return (
                f"wallet SOL {wallet_sol:.4f} below hard floor {self.MIN_SOL_WALLET:.2f}; "
                f"fund wallet before opening positions"
            )

        # ── check 2: position size vs rent ───────────────────────────────
        rent_usd = rent_sol * self._sol_price_usd
        min_position_usd = rent_usd * self.MIN_RENT_COVERAGE_MULTIPLIER
        if amount_y_usd < min_position_usd:
            return (
                f"position ${amount_y_usd:.2f} below minimum ${min_position_usd:.2f} "
                f"(rent for {n_bins} bins ≈ ${rent_usd:.2f} at ${self._sol_price_usd:.0f}/SOL "
                f"× {self.MIN_RENT_COVERAGE_MULTIPLIER}x coverage required)"
            )

        return None  # all clear

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

        # ── SOL economics guardrail ───────────────────────────────────────
        if amount_y > 0:
            reason = await self._check_position_sol_viability(amount_y, bin_range)
            if reason:
                log.error("SOL economics guard blocked open_position: %s", reason)
                position = self._build_position(
                    pool_address, pool_name, bin_range, amount_x, amount_y, ""
                )
                return OpenResult(tx_signature="", position=position, error=reason)

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
            opened_at=datetime.now(UTC),
            last_rebalanced_at=None,
            status=PositionStatus.OPEN,
            tx_signature_open=sig,
        )
