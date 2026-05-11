from __future__ import annotations

import logging

from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey  # type: ignore

from src.dashboard.wallet import Network, get_balance
from src.vault import client as vault_client

log = logging.getLogger(__name__)


async def top_up_if_needed(
    rpc: AsyncClient,
    wallet_pubkey: Pubkey,
    network: "Network",
    required_usdc: float,
    dry_run: bool,
) -> None:
    """If hot wallet USDC < required_usdc, withdraw the deficit from the vault."""
    try:
        balance = await get_balance(rpc, wallet_pubkey, network)
        current = balance["usdcBalance"]
        if current >= required_usdc:
            return
        deficit = required_usdc - current
        if dry_run:
            log.info("DRY_RUN: would withdraw %.2f USDC from vault", deficit)
            return
        amount_micro = round(deficit * 1_000_000)
        result = await vault_client.manager_withdraw(amount_micro)
        log.info("Withdrew %.2f USDC from vault: %s", deficit, result)
    except Exception as exc:
        log.warning("top_up_if_needed failed (vault not touched): %s", exc)


async def sweep_to_vault(
    rpc: AsyncClient,
    wallet_pubkey: Pubkey,
    network: "Network",
    keep_usdc: float,
    dry_run: bool,
) -> None:
    """Return any USDC above keep_usdc from hot wallet to vault."""
    try:
        balance = await get_balance(rpc, wallet_pubkey, network)
        current = balance["usdcBalance"]
        if current <= keep_usdc:
            return
        surplus = current - keep_usdc
        if dry_run:
            log.info("DRY_RUN: would return %.2f USDC to vault", surplus)
            return
        amount_micro = round(surplus * 1_000_000)
        result = await vault_client.manager_return(amount_micro)
        log.info("Returned %.2f USDC to vault: %s", surplus, result)
    except Exception as exc:
        log.warning("sweep_to_vault failed (vault not touched): %s", exc)
