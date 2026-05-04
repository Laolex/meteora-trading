"""
Main entrypoint. Two modes:
  - discovery: scan pool universe, score, write rankings to DB
  - run: full autonomous loop (discovery + position mgmt + rebalancing)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair  # type: ignore

from src.config import CONFIG
from src.db import Database
from src.discovery.client import MeteoraClient
from src.discovery.scorer import ScoringWeights, score_pools
from src.position.manager import MeteoraPositionManager, PositionRange
from src.rebalance.decision import Action, ActionType, DecisionContext, decide
from src.rebalance.guards import SafetyGuard

log = logging.getLogger(__name__)


def setup_logging(level: str, log_file) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            # logging.FileHandler(log_file),  # uncomment when log dir exists
        ],
    )


async def run_discovery() -> None:
    """One-shot: fetch pools, score them, log top 10."""
    log.info("Starting discovery mode")
    client = MeteoraClient(CONFIG.meteora_api_base)
    db = Database(CONFIG.database_url)
    try:
        await db.connect()
        pools = await client.list_all_pools()
        log.info("Fetched %d pools", len(pools))
        for pool in pools:
            await db.upsert_pool_snapshot(pool)

        weights = ScoringWeights(
            fees_24h=CONFIG.score_weight_fees_24h,
            volume_tvl=CONFIG.score_weight_volume_tvl,
            token_quality=CONFIG.score_weight_token_quality,
            bin_liquidity=CONFIG.score_weight_bin_liquidity,
        )
        ranked = score_pools(pools, weights)
        await db.store_pool_scores(ranked)

        log.info("=== TOP 10 POOLS ===")
        for i, sp in enumerate(ranked[:10], 1):
            log.info(
                "#%-2d %-20s score=%.3f  TVL=$%-12.0f  vol24h=$%-12.0f  fee_apr=%.1f%%",
                i, sp.pool.name, sp.score, sp.pool.tvl_usd,
                sp.pool.volume_24h_usd, sp.pool.fee_apr * 100,
            )
    finally:
        await client.close()
        await db.close()


def _load_keypair_from_file(path: str) -> Keypair:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, list):
        raise RuntimeError(f"Invalid keypair file: {path}")
    return Keypair.from_bytes(bytes(raw))


def _position_range(active_bin_id: int, width: int) -> PositionRange:
    half = width // 2
    return PositionRange(lower_bin_id=active_bin_id - half, upper_bin_id=active_bin_id + half)


async def _execute_action(
    *,
    db: Database,
    manager: MeteoraPositionManager,
    action: Action,
    position,
    pool,
    size_usd: float,
) -> None:
    await db.log_action(pool.address, action, position_id=position.id)
    if action.type == ActionType.HOLD:
        return
    if action.type == ActionType.CLAIM:
        sig = await manager.claim_fees(position)
        await db.log_action(
            pool.address,
            action,
            position_id=position.id,
            executed=True,
            tx_signature=sig,
            success=True,
        )
        return
    if action.type == ActionType.EXIT:
        sig = await manager.close_position(position)
        await db.mark_position_closed(position.id, sig)
        await db.log_action(
            pool.address,
            action,
            position_id=position.id,
            executed=True,
            tx_signature=sig,
            success=True,
        )
        return
    if action.type == ActionType.REBALANCE:
        if action.new_lower_bin_id is None or action.new_upper_bin_id is None:
            raise RuntimeError("Rebalance action missing target range")
        close_sig = await manager.close_position(position)
        await db.mark_position_closed(position.id, close_sig)
        open_result = await manager.open_position(
            pool_address=pool.address,
            pool_name=pool.name,
            amount_x=0.0,
            amount_y=size_usd,
            bin_range=PositionRange(action.new_lower_bin_id, action.new_upper_bin_id),
        )
        open_result.position.deposited_value_usd = size_usd
        await db.upsert_position(open_result.position)
        await db.log_action(
            pool.address,
            action,
            position_id=open_result.position.id,
            executed=True,
            tx_signature=open_result.tx_signature,
            success=True,
        )
        return
    raise RuntimeError(f"Unknown action type: {action.type}")


async def run_loop() -> None:
    """
    Autonomous loop. Day 5–6 task: wire decision engine + position manager + executor.

    Skeleton only — real loop body needs:
      1. Refresh pool snapshots for held positions
      2. For each open position: build DecisionContext → decide() → execute
      3. If no positions and capital available: open new position from top-ranked pool
      4. Run safety guards before every write
      5. Log everything to actions_log
    """
    log.info("Starting autonomous loop (DRY_RUN=%s, NETWORK=%s)", CONFIG.dry_run, CONFIG.network)
    wallet = _load_keypair_from_file(str(CONFIG.hot_wallet_keypair_path))
    rpc = AsyncClient(CONFIG.rpc_url)
    manager = MeteoraPositionManager(
        rpc_client=rpc,
        wallet=wallet,
        node_helper_path=CONFIG.node_helper_path,
        dry_run=CONFIG.dry_run,
    )
    db = Database(CONFIG.database_url)
    client = MeteoraClient(CONFIG.meteora_api_base)
    await db.connect()

    guard = SafetyGuard(
        max_position_usd=CONFIG.max_position_usd,
        max_total_deployed_usd=CONFIG.max_total_deployed_usd,
        daily_loss_limit_pct=CONFIG.daily_loss_limit_pct,
        kill_switch_file=CONFIG.kill_switch_file,
    )
    weights = ScoringWeights(
        fees_24h=CONFIG.score_weight_fees_24h,
        volume_tvl=CONFIG.score_weight_volume_tvl,
        token_quality=CONFIG.score_weight_token_quality,
        bin_liquidity=CONFIG.score_weight_bin_liquidity,
    )

    try:
        while True:
            try:
                kill_check = guard.check_kill_switch()
                if not kill_check.allowed:
                    log.warning("Kill switch active — sleeping 60s. Reason: %s", kill_check.reason)
                    await asyncio.sleep(60)
                    continue

                pools = await client.list_all_pools()
                for pool in pools:
                    await db.upsert_pool_snapshot(pool)
                ranked = score_pools(pools, weights)
                await db.store_pool_scores(ranked)
                pools_by_addr = {p.address: p for p in pools}

                open_positions = await db.list_open_positions()
                current_total = sum(p.deposited_value_usd for p in open_positions)
                await db.ensure_daily_baseline(current_total)
                day_start = await db.get_today_starting_value()

                if not open_positions and ranked and CONFIG.max_open_positions > 0:
                    top = ranked[0].pool
                    guard_res = guard.all_clear(
                        proposed_position_usd=CONFIG.default_position_size_usd,
                        current_total_usd=current_total,
                        day_start_value_usd=day_start,
                        current_value_usd=current_total,
                    )
                    if guard_res.allowed:
                        r = _position_range(top.active_bin_id, CONFIG.target_position_width_bins)
                        opened = await manager.open_position(
                            pool_address=top.address,
                            pool_name=top.name,
                            amount_x=0.0,
                            amount_y=CONFIG.default_position_size_usd,
                            bin_range=r,
                        )
                        opened.position.deposited_value_usd = CONFIG.default_position_size_usd
                        await db.upsert_position(opened.position)
                        await db.log_action(
                            top.address,
                            Action(ActionType.REBALANCE, "opened initial position"),
                            position_id=opened.position.id,
                            executed=True,
                            tx_signature=opened.tx_signature,
                            success=True,
                        )
                        log.info(
                            "Opened initial position on %s (%s) bins %d..%d",
                            top.name,
                            top.address,
                            r.lower_bin_id,
                            r.upper_bin_id,
                        )
                    else:
                        log.warning("Initial open blocked by guard: %s", guard_res.reason)

                for position in open_positions:
                    pool = pools_by_addr.get(position.pool_address)
                    if pool is None:
                        log.warning("Skipping position %s; pool %s missing in snapshot", position.id, position.pool_address)
                        continue

                    est_fees = max(
                        0.0,
                        position.deposited_value_usd
                        * (pool.fee_apr / 365.0)
                        * (CONFIG.loop_interval_seconds / 86400.0),
                    )
                    ctx = DecisionContext(
                        position=position,
                        pool=pool,
                        volatility_24h_pct=0.0,  # TODO: source from oracle/history
                        sol_price_usd=pool.current_price,
                        current_fees_usd=position.fees_earned_usd + est_fees,
                        rebalance_drift_bps=CONFIG.rebalance_drift_bps,
                        rebalance_min_fees_usd=CONFIG.rebalance_min_fees_usd,
                        exit_volatility_24h_pct=CONFIG.exit_volatility_24h_pct,
                    )
                    action = decide(ctx)
                    try:
                        await _execute_action(
                            db=db,
                            manager=manager,
                            action=action,
                            position=position,
                            pool=pool,
                            size_usd=max(position.deposited_value_usd, CONFIG.default_position_size_usd),
                        )
                    except Exception as exc:
                        await db.log_action(
                            pool.address,
                            action,
                            position_id=position.id,
                            executed=True,
                            success=False,
                            error_message=str(exc),
                        )
                        log.exception("Action execution failed for position %s", position.id)

                await asyncio.sleep(CONFIG.loop_interval_seconds)
            except KeyboardInterrupt:
                log.info("Shutting down")
                return
            except Exception:
                log.exception("Loop error — sleeping 30s before retry")
                await asyncio.sleep(30)
    finally:
        await client.close()
        await db.close()
        await rpc.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["discovery", "run"],
        required=True,
        help="discovery: one-shot pool scan; run: autonomous loop",
    )
    args = parser.parse_args()

    setup_logging(CONFIG.log_level, CONFIG.log_file)

    if args.mode == "discovery":
        asyncio.run(run_discovery())
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
