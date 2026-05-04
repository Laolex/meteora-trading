"""
Main entrypoint. Two modes:
  - discovery: scan pool universe, score, write rankings to DB
  - run: full autonomous loop (discovery + position mgmt + rebalancing)
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from typing import Literal

from src.config import CONFIG
from src.discovery.client import MeteoraClient
from src.discovery.scorer import ScoringWeights, score_pools
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
    try:
        pools = await client.list_all_pools()
        log.info("Fetched %d pools", len(pools))

        weights = ScoringWeights(
            fees_24h=CONFIG.score_weight_fees_24h,
            volume_tvl=CONFIG.score_weight_volume_tvl,
            token_quality=CONFIG.score_weight_token_quality,
            bin_liquidity=CONFIG.score_weight_bin_liquidity,
        )
        ranked = score_pools(pools, weights)

        log.info("=== TOP 10 POOLS ===")
        for i, sp in enumerate(ranked[:10], 1):
            log.info(
                "#%-2d %-20s score=%.3f  TVL=$%-12.0f  vol24h=$%-12.0f  fee_apr=%.1f%%",
                i, sp.pool.name, sp.score, sp.pool.tvl_usd,
                sp.pool.volume_24h_usd, sp.pool.fee_apr * 100,
            )
        # TODO day 7: persist to pool_scores table
    finally:
        await client.close()


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

    guard = SafetyGuard(
        max_position_usd=CONFIG.max_position_usd,
        max_total_deployed_usd=CONFIG.max_total_deployed_usd,
        daily_loss_limit_pct=CONFIG.daily_loss_limit_pct,
        kill_switch_file=CONFIG.kill_switch_file,
    )

    while True:
        try:
            kill_check = guard.check_kill_switch()
            if not kill_check.allowed:
                log.warning("Kill switch active — sleeping 60s. Reason: %s", kill_check.reason)
                await asyncio.sleep(60)
                continue

            # TODO day 5: implement loop body
            log.info("[loop tick] — implement me")

            await asyncio.sleep(CONFIG.loop_interval_seconds)
        except KeyboardInterrupt:
            log.info("Shutting down")
            return
        except Exception:
            log.exception("Loop error — sleeping 30s before retry")
            await asyncio.sleep(30)


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
