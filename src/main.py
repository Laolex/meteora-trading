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
from pathlib import Path

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair  # type: ignore

from src.config import CONFIG, Config
from src.db import Database
from src.discovery.client import MeteoraClient
from src.discovery.scorer import ScoringWeights, score_pools
from src.position.manager import MeteoraPositionManager, PositionRange, y_only_range
from src.rebalance.adaptive import adaptive_range_bins
from src.rebalance.decision import Action, ActionType, DecisionContext, compute_volatility_pct, decide
from src.rebalance.guards import SafetyGuard
from src.rebalance.memo import build_memo_text, send_memo
from src.rebalance.tuner import LLMTuner, TunedParams
# from src.vault.capital import sweep_to_vault, top_up_if_needed

_STATE_FILE = Path("/opt/meteora-agent/var/agent-state.json")

log = logging.getLogger(__name__)


def _require_config() -> Config:
    if CONFIG is None:
        raise RuntimeError("CONFIG is not loaded. Set METEORA_SKIP_CONFIG_LOAD=0 for runtime commands.")
    return CONFIG


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
    config = _require_config()
    client = MeteoraClient(config.meteora_api_base)
    db = Database(config.database_url)
    try:
        await db.connect()
        pools = await client.list_all_pools()
        log.info("Fetched %d pools", len(pools))
        for pool in pools:
            await db.upsert_pool_snapshot(pool)

        weights = ScoringWeights(
            fees_24h=config.score_weight_fees_24h,
            volume_tvl=config.score_weight_volume_tvl,
            token_quality=config.score_weight_token_quality,
            bin_liquidity=config.score_weight_bin_liquidity,
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
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, list):
        raise RuntimeError(f"Invalid keypair file: {path}")
    return Keypair.from_bytes(bytes(raw))


def _position_range(active_bin_id: int, width: int) -> PositionRange:
    half = width // 2
    return PositionRange(lower_bin_id=active_bin_id - half, upper_bin_id=active_bin_id + half)


def _y_only_range(active_bin_id: int, width: int) -> PositionRange:
    return y_only_range(active_bin_id, width)


def _tuned_or_default(tuned: TunedParams | None, config) -> tuple[int, float]:
    """Return (rebalance_drift_bps, exit_volatility_24h_pct) from tuner or config."""
    if tuned is not None:
        return tuned.rebalance_drift_bps, tuned.exit_volatility_24h_pct
    return config.rebalance_drift_bps, config.exit_volatility_24h_pct


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
        rebalance_width = action.new_upper_bin_id - action.new_lower_bin_id + 1
        close_sig = await manager.close_position(position)
        await db.mark_position_closed(position.id, close_sig)
        open_result = await manager.open_position(
            pool_address=pool.address,
            pool_name=pool.name,
            amount_x=0.0,
            amount_y=size_usd,
            bin_range=y_only_range(pool.active_bin_id, rebalance_width),
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
    config = _require_config()
    log.info("Starting autonomous loop (DRY_RUN=%s, NETWORK=%s)", config.dry_run, config.network)
    wallet = _load_keypair_from_file(str(config.hot_wallet_keypair_path))
    rpc = AsyncClient(config.rpc_url)
    manager = MeteoraPositionManager(
        rpc_client=rpc,
        wallet=wallet,
        node_helper_path=config.node_helper_path,
        dry_run=config.dry_run,
    )
    db = Database(config.database_url)
    client = MeteoraClient(config.meteora_api_base)
    await db.connect()

    guard = SafetyGuard(
        max_position_usd=config.max_position_usd,
        max_total_deployed_usd=config.max_total_deployed_usd,
        daily_loss_limit_pct=config.daily_loss_limit_pct,
        kill_switch_file=config.kill_switch_file,
    )
    weights = ScoringWeights(
        fees_24h=config.score_weight_fees_24h,
        volume_tvl=config.score_weight_volume_tvl,
        token_quality=config.score_weight_token_quality,
        bin_liquidity=config.score_weight_bin_liquidity,
    )

    tuner: LLMTuner | None = None
    if config.anthropic_api_key:
        tuner = LLMTuner(
            api_key=config.anthropic_api_key,
            tune_interval_seconds=config.llm_tune_interval_seconds,
        )
        log.info("LLM parameter tuner enabled (interval=%ds)", config.llm_tune_interval_seconds)
    else:
        log.info("LLM parameter tuner disabled — set ANTHROPIC_API_KEY to enable")

    try:
        while True:
            try:
                kill_check = guard.check_kill_switch()
                if not kill_check.allowed:
                    log.warning("Kill switch active — sleeping 60s. Reason: %s", kill_check.reason)
                    await asyncio.sleep(60)
                    continue

                pools = await client.list_all_pools()
                for snapshot_pool in pools:
                    await db.upsert_pool_snapshot(snapshot_pool)
                ranked = score_pools(pools, weights)
                await db.store_pool_scores(ranked)
                pools_by_addr = {p.address: p for p in pools}

                open_positions = await db.list_open_positions()
                current_total = sum(p.deposited_value_usd for p in open_positions)
                await db.ensure_daily_baseline(current_total)
                day_start = await db.get_today_starting_value()

                # await top_up_if_needed(
                #     rpc=rpc,
                #     wallet_pubkey=wallet.pubkey(),
                #     network=config.network,
                #     required_usdc=config.default_position_size_usd,
                #     dry_run=config.dry_run,
                # )

                if not open_positions and ranked and config.max_open_positions > 0:
                    top = ranked[0].pool
                    # Compute vol for the top pool so we can size the range adaptively
                    top_price_24h_ago = await db.get_price_24h_ago(top.address)
                    top_vol_pct = compute_volatility_pct(top.current_price, top_price_24h_ago)
                    open_width = adaptive_range_bins(
                        config.target_position_width_bins,
                        top_vol_pct,
                        reference_vol_pct=config.adaptive_range_reference_vol_pct,
                        min_bins=config.adaptive_range_min_bins,
                        max_bins=config.adaptive_range_max_bins,
                    )
                    log.info(
                        "Adaptive range for %s: vol=%.1f%% → %d bins (base=%d)",
                        top.name, top_vol_pct, open_width, config.target_position_width_bins,
                    )

                    # When nothing is deployed the daily-PnL check is meaningless
                    # (0 vs day_start baseline looks like 100% loss). Pass 0 as baseline
                    # so the guard skips that check and only validates size/total limits.
                    guard_res = guard.all_clear(
                        proposed_position_usd=config.default_position_size_usd,
                        current_total_usd=current_total,
                        day_start_value_usd=0.0,
                        current_value_usd=current_total,
                    )
                    if guard_res.allowed:
                        r = y_only_range(top.active_bin_id, open_width)
                        opened = await manager.open_position(
                            pool_address=top.address,
                            pool_name=top.name,
                            amount_x=0.0,
                            amount_y=config.default_position_size_usd,
                            bin_range=r,
                        )
                        opened.position.deposited_value_usd = config.default_position_size_usd
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
                        log.warning(
                            "Skipping position %s; pool %s missing in snapshot",
                            position.id,
                            position.pool_address,
                        )
                        continue

                    # Volatility from price history — enables EXIT safety rule
                    price_24h_ago = await db.get_price_24h_ago(pool.address)
                    volatility_24h_pct = compute_volatility_pct(pool.current_price, price_24h_ago)

                    # LLM parameter tuning — runs once per hour if not disabled by operator
                    if tuner is not None and tuner.due():
                        if config.llm_disabled_file.exists():
                            log.info("LLM tuner disabled by operator — using config defaults")
                        else:
                            drift_now = position.drift_bps_from_center(pool.active_bin_id, pool.bin_step)
                            rebalance_count = await db.count_rebalances_today(pool.address)
                            tuned = tuner.tune(
                                pool_name=pool.name,
                                volatility_24h_pct=volatility_24h_pct,
                                fee_apr=pool.fee_apr,
                                drift_bps=drift_now,
                                out_of_range=not position.is_in_range(pool.active_bin_id),
                                rebalance_count=rebalance_count,
                                default_drift_bps=config.rebalance_drift_bps,
                                default_exit_vol_pct=config.exit_volatility_24h_pct,
                            )
                            # Persist tuner state for dashboard /agent/state endpoint
                            _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
                            with open(_STATE_FILE, "w") as _sf:
                                json.dump({
                                    "llmEnabled": True,
                                    "llmDisabledByOperator": False,
                                    "anthropicKeyConfigured": bool(config.anthropic_api_key),
                                    "tunedAt": tuned.tuned_at.isoformat(),
                                    "rebalanceDriftBps": tuned.rebalance_drift_bps,
                                    "exitVolatilityPct": tuned.exit_volatility_24h_pct,
                                    "reasoning": tuned.reasoning,
                                }, _sf)

                    drift_bps, exit_vol_pct = _tuned_or_default(
                        tuner.cached if tuner else None, config
                    )

                    # Estimated fees this loop cycle
                    in_range = position.is_in_range(pool.active_bin_id)
                    est_fees = (
                        position.deposited_value_usd
                        * (pool.fee_apr / 365.0)
                        * (config.loop_interval_seconds / 86400.0)
                        if in_range else 0.0
                    )
                    total_fees_usd = position.fees_earned_usd + est_fees

                    # Mark-to-market: fees grow NAV; out-of-range positions lock value
                    current_value_usd = position.deposited_value_usd + total_fees_usd

                    # Persist fee accumulation and updated value every loop
                    if est_fees > 0:
                        await db.accumulate_position_fees(
                            position.id, est_fees, current_value_usd
                        )

                    ctx = DecisionContext(
                        position=position,
                        pool=pool,
                        volatility_24h_pct=volatility_24h_pct,
                        sol_price_usd=pool.current_price,
                        current_fees_usd=total_fees_usd,
                        rebalance_drift_bps=drift_bps,
                        rebalance_min_fees_usd=config.rebalance_min_fees_usd,
                        exit_volatility_24h_pct=exit_vol_pct,
                    )
                    action = decide(ctx)
                    try:
                        await _execute_action(
                            db=db,
                            manager=manager,
                            action=action,
                            position=position,
                            pool=pool,
                            size_usd=max(position.deposited_value_usd, config.default_position_size_usd),
                        )
                        # On-chain receipt for every non-HOLD action
                        if action.type in (ActionType.REBALANCE, ActionType.EXIT, ActionType.CLAIM):
                            memo = build_memo_text(action.type.value, pool.address, action.reason)
                            await send_memo(rpc, wallet, memo, config.dry_run)
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

                # await sweep_to_vault(
                #     rpc=rpc,
                #     wallet_pubkey=wallet.pubkey(),
                #     network=config.network,
                #     keep_usdc=config.default_position_size_usd,
                #     dry_run=config.dry_run,
                # )

                await asyncio.sleep(config.loop_interval_seconds)
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
        choices=["discovery", "run", "dashboard"],
        required=True,
        help="discovery: one-shot pool scan; run: autonomous loop; dashboard: FastAPI server",
    )
    args = parser.parse_args()

    config = _require_config()
    setup_logging(config.log_level, config.log_file)

    if args.mode == "discovery":
        asyncio.run(run_discovery())
    elif args.mode == "dashboard":
        import uvicorn
        from src.dashboard.api import app
        uvicorn.run(app, host=config.dashboard_host, port=config.dashboard_port, log_level=config.log_level.lower())
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
