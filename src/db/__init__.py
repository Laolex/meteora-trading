from __future__ import annotations

from datetime import date, timedelta

import asyncpg

from src.discovery.models import PoolSnapshot
from src.discovery.scorer import ScoredPool
from src.position.models import Position, PositionStatus
from src.rebalance.decision import Action


class Database:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=5)

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    def _require_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Database not connected")
        return self._pool

    async def upsert_pool_snapshot(self, snapshot: PoolSnapshot) -> None:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO pools(
                        address,
                        name,
                        token_x_mint,
                        token_y_mint,
                        bin_step,
                        base_fee_pct,
                        last_seen_at
                    )
                    VALUES($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT(address) DO UPDATE SET
                        name=EXCLUDED.name,
                        token_x_mint=EXCLUDED.token_x_mint,
                        token_y_mint=EXCLUDED.token_y_mint,
                        bin_step=EXCLUDED.bin_step,
                        base_fee_pct=EXCLUDED.base_fee_pct,
                        last_seen_at=NOW()
                    """,
                    snapshot.address,
                    snapshot.name,
                    snapshot.token_x_mint,
                    snapshot.token_y_mint,
                    snapshot.bin_step,
                    snapshot.base_fee_pct,
                )
                await conn.execute(
                    """
                    INSERT INTO pool_snapshots(
                        pool_address,
                        tvl_usd,
                        volume_24h_usd,
                        fees_24h_usd,
                        current_price,
                        active_bin_id,
                        fee_apr
                    )
                    VALUES($1, $2, $3, $4, $5, $6, $7)
                    """,
                    snapshot.address,
                    snapshot.tvl_usd,
                    snapshot.volume_24h_usd,
                    snapshot.fees_24h_usd,
                    snapshot.current_price,
                    snapshot.active_bin_id,
                    snapshot.fee_apr,
                )

    async def store_pool_scores(self, scored_pools: list[ScoredPool]) -> None:
        if not scored_pools:
            return
        pool = self._require_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                for sp in scored_pools:
                    await conn.execute(
                        """
                        INSERT INTO pool_scores(
                            pool_address, score, component_fees_24h, component_volume_tvl,
                            component_token_quality, component_bin_liquidity
                        )
                        VALUES($1, $2, $3, $4, $5, $6)
                        """,
                        sp.pool.address,
                        sp.score,
                        sp.component_scores["fees_24h"],
                        sp.component_scores["volume_tvl"],
                        sp.component_scores["token_quality"],
                        sp.component_scores["bin_liquidity"],
                    )

    async def list_open_positions(self) -> list[Position]:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id::text AS id,
                    pool_address, pool_name, lower_bin_id, upper_bin_id,
                    deposited_x, deposited_y, deposited_value_usd,
                    fees_earned_x, fees_earned_y, fees_earned_usd,
                    opened_at, last_rebalanced_at, status, tx_signature_open
                FROM positions
                WHERE status = 'open'
                ORDER BY opened_at ASC
                """
            )
        return [self._row_to_position(r) for r in rows]

    async def list_positions(self, limit: int = 50) -> list[dict]:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id::text AS id,
                    pool_address,
                    pool_name,
                    lower_bin_id,
                    upper_bin_id,
                    deposited_value_usd,
                    fees_earned_usd,
                    opened_at,
                    status,
                    tx_signature_open
                FROM positions
                ORDER BY opened_at DESC
                LIMIT $1
                """,
                limit,
            )
        return [
            {
                "id": row["id"],
                "poolAddress": row["pool_address"],
                "poolName": row["pool_name"],
                "lowerBinId": row["lower_bin_id"],
                "upperBinId": row["upper_bin_id"],
                "depositedValueUsd": float(row["deposited_value_usd"]),
                "feesEarnedUsd": float(row["fees_earned_usd"]),
                "openedAt": row["opened_at"].isoformat(),
                "status": row["status"],
                "txSignatureOpen": row["tx_signature_open"],
            }
            for row in rows
        ]

    async def upsert_position(self, position: Position) -> None:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO positions(
                    id,
                    pool_address,
                    pool_name,
                    lower_bin_id,
                    upper_bin_id,
                    deposited_x,
                    deposited_y,
                    deposited_value_usd,
                    fees_earned_x,
                    fees_earned_y,
                    fees_earned_usd,
                    opened_at,
                    last_rebalanced_at,
                    status,
                    tx_signature_open
                )
                VALUES(
                    $1::uuid, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15
                )
                ON CONFLICT(id) DO UPDATE SET
                    lower_bin_id=EXCLUDED.lower_bin_id,
                    upper_bin_id=EXCLUDED.upper_bin_id,
                    deposited_x=EXCLUDED.deposited_x,
                    deposited_y=EXCLUDED.deposited_y,
                    deposited_value_usd=EXCLUDED.deposited_value_usd,
                    fees_earned_x=EXCLUDED.fees_earned_x,
                    fees_earned_y=EXCLUDED.fees_earned_y,
                    fees_earned_usd=EXCLUDED.fees_earned_usd,
                    last_rebalanced_at=EXCLUDED.last_rebalanced_at,
                    status=EXCLUDED.status
                """,
                position.id,
                position.pool_address,
                position.pool_name,
                position.lower_bin_id,
                position.upper_bin_id,
                position.deposited_x,
                position.deposited_y,
                position.deposited_value_usd,
                position.fees_earned_x,
                position.fees_earned_y,
                position.fees_earned_usd,
                position.opened_at,
                position.last_rebalanced_at,
                position.status.value,
                position.tx_signature_open,
            )

    async def mark_position_closed(self, position_id: str, close_signature: str) -> None:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE positions
                SET status='closed', closed_at=NOW(), tx_signature_close=$2
                WHERE id=$1::uuid
                """,
                position_id,
                close_signature,
            )

    async def log_action(
        self,
        pool_address: str,
        action: Action,
        *,
        position_id: str | None = None,
        executed: bool = False,
        tx_signature: str | None = None,
        success: bool | None = None,
        error_message: str | None = None,
        is_dry_run: bool = False,
    ) -> None:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO actions_log(
                    position_id, pool_address, action_type, reason,
                    executed_at, tx_signature, success, error_message, is_dry_run
                )
                VALUES($1::uuid, $2, $3, $4, CASE WHEN $5 THEN NOW() ELSE NULL END, $6, $7, $8, $9)
                """,
                position_id,
                pool_address,
                action.type.value,
                action.reason,
                executed,
                tx_signature,
                success,
                error_message,
                is_dry_run,
            )

    async def ensure_daily_baseline(self, baseline_usd: float) -> None:
        pool = self._require_pool()
        today = date.today()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO pnl_daily(day, starting_value_usd)
                VALUES($1, $2)
                ON CONFLICT(day) DO NOTHING
                """,
                today,
                baseline_usd,
            )

    async def get_today_starting_value(self) -> float:
        pool = self._require_pool()
        today = date.today()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT starting_value_usd FROM pnl_daily WHERE day=$1", today)
        return float(row["starting_value_usd"]) if row else 0.0

    async def get_starting_value_days_ago(self, days_ago: int) -> float | None:
        pool = self._require_pool()
        target_day = date.today() - timedelta(days=days_ago)
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT starting_value_usd FROM pnl_daily WHERE day=$1", target_day)
        if row is None:
            return None
        return float(row["starting_value_usd"])

    async def get_price_24h_ago(self, pool_address: str) -> float | None:
        """Return the oldest price captured in the last 24 h for a pool, or None."""
        pool = self._require_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT current_price
                FROM pool_snapshots
                WHERE pool_address = $1
                  AND captured_at >= NOW() - INTERVAL '24 hours'
                ORDER BY captured_at ASC
                LIMIT 1
                """,
                pool_address,
            )
        return float(row["current_price"]) if row else None

    async def count_rebalances_today(self, pool_address: str) -> int:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT COUNT(*) AS n FROM actions_log
                WHERE pool_address = $1
                  AND action_type = 'rebalance'
                  AND decided_at >= CURRENT_DATE
                """,
                pool_address,
            )
        return int(row["n"]) if row else 0

    async def accumulate_position_fees(
        self,
        position_id: str,
        add_fees_usd: float,
        current_value_usd: float,
    ) -> None:
        """Add estimated fees to fees_earned_usd and update mark-to-market value."""
        pool = self._require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE positions
                SET fees_earned_usd    = fees_earned_usd + $2,
                    deposited_value_usd = $3
                WHERE id = $1::uuid AND status = 'open'
                """,
                position_id,
                add_fees_usd,
                current_value_usd,
            )

    # --- Dashboard queries ---

    async def get_position_stats(self) -> dict:
        """Aggregate stats for open positions."""
        pool = self._require_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'open')                    AS open_count,
                    COALESCE(SUM(deposited_value_usd) FILTER (WHERE status = 'open'), 0) AS total_deployed,
                    COALESCE(SUM(fees_earned_usd) FILTER (WHERE status = 'open'), 0)     AS fees_earned
                FROM positions
                """
            )
            pnl_today = await conn.fetchrow(
                "SELECT starting_value_usd FROM pnl_daily WHERE day = CURRENT_DATE"
            )
            pnl_week = await conn.fetchrow(
                "SELECT starting_value_usd FROM pnl_daily WHERE day = CURRENT_DATE - INTERVAL '7 days'"
            )
        total_deployed = float(row["total_deployed"])
        day_start = float(pnl_today["starting_value_usd"]) if pnl_today else total_deployed
        week_start = float(pnl_week["starting_value_usd"]) if pnl_week else total_deployed
        loss_pct = max(0.0, (day_start - total_deployed) / day_start * 100) if day_start > 0 else 0.0
        return {
            "open_count": int(row["open_count"]),
            "total_deployed": total_deployed,
            "fees_earned": float(row["fees_earned"]),
            "pnl_day": total_deployed - day_start,
            "pnl_week": total_deployed - week_start,
            "daily_loss_pct": loss_pct,
        }

    async def get_activity(self, limit: int) -> list[dict]:
        """Recent actions log entries, newest first."""
        pool = self._require_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    a.id,
                    a.position_id::text    AS position_id,
                    a.pool_address,
                    COALESCE(p.name, a.pool_address) AS pool_name,
                    a.action_type,
                    a.reason,
                    a.decided_at,
                    a.executed_at,
                    a.tx_signature,
                    a.success
                FROM actions_log a
                LEFT JOIN pools p ON p.address = a.pool_address
                ORDER BY a.decided_at DESC
                LIMIT $1
                """,
                limit,
            )
        return [
            {
                "id": row["id"],
                "positionId": row["position_id"],
                "poolAddress": row["pool_address"],
                "poolName": row["pool_name"],
                "actionType": row["action_type"],
                "reason": row["reason"],
                "decidedAt": row["decided_at"].isoformat(),
                "executedAt": row["executed_at"].isoformat() if row["executed_at"] else None,
                "txSignature": row["tx_signature"],
                "success": row["success"],
            }
            for row in rows
        ]

    @staticmethod
    def _row_to_position(row: asyncpg.Record) -> Position:
        return Position(
            id=row["id"],
            pool_address=row["pool_address"],
            pool_name=row["pool_name"],
            lower_bin_id=row["lower_bin_id"],
            upper_bin_id=row["upper_bin_id"],
            deposited_x=row["deposited_x"],
            deposited_y=row["deposited_y"],
            deposited_value_usd=row["deposited_value_usd"],
            fees_earned_x=row["fees_earned_x"],
            fees_earned_y=row["fees_earned_y"],
            fees_earned_usd=row["fees_earned_usd"],
            opened_at=row["opened_at"],
            last_rebalanced_at=row["last_rebalanced_at"],
            status=PositionStatus(row["status"]),
            tx_signature_open=row["tx_signature_open"],
        )
