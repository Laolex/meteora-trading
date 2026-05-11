"""Thin async wrapper around vault.js node helper."""

import asyncio
import json
import os
from pathlib import Path


VAULT_HELPER = Path(__file__).resolve().parents[2] / "node-helper" / "vault.js"


async def _invoke(command: str, args: dict | None = None) -> dict:
    env = {**os.environ}
    proc = await asyncio.create_subprocess_exec(
        "node", str(VAULT_HELPER), command,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )
    payload = json.dumps(args or {}).encode()
    stdout, stderr = await proc.communicate(input=payload)
    if proc.returncode != 0:
        raise RuntimeError(f"vault.js {command} failed: {stderr.decode().strip()}")
    return json.loads(stdout.decode())


async def get_state() -> dict:
    """Return vault state dict; initialized=False if vault not yet created."""
    return await _invoke("get-state")


async def initialize(usdc_mint: str, deposit_cap_usdc: float) -> dict:
    return await _invoke("initialize-vault", {
        "usdc_mint": usdc_mint,
        "deposit_cap_usdc": int(deposit_cap_usdc),
    })


async def manager_withdraw(amount_micro: int) -> str:
    """Pull `amount_micro` micro-USDC from vault to manager hot wallet. Returns tx signature."""
    result = await _invoke("manager-withdraw", {"amount_micro": amount_micro})
    return result["signature"]


async def manager_return(amount_micro: int) -> str:
    """Return `amount_micro` micro-USDC from hot wallet to vault; updates NAV. Returns tx signature."""
    result = await _invoke("manager-return", {"amount_micro": amount_micro})
    return result["signature"]
