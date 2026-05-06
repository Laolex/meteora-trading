"""Hot wallet balance fetching and withdrawal execution."""
from __future__ import annotations

import struct
from typing import Literal

from solana.rpc.async_api import AsyncClient
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair  # type: ignore
from solders.message import MessageV0
from solders.pubkey import Pubkey  # type: ignore
from solders.system_program import TransferParams, transfer
from solders.transaction import VersionedTransaction

USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

_TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
_ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1brs")

Network = Literal["mainnet", "devnet"]


def usdc_mint(network: Network) -> Pubkey:
    mint = USDC_MINT_MAINNET if network == "mainnet" else USDC_MINT_DEVNET
    return Pubkey.from_string(mint)


def get_associated_token_address(owner: Pubkey, mint: Pubkey) -> Pubkey:
    seeds = [bytes(owner), bytes(_TOKEN_PROGRAM_ID), bytes(mint)]
    return Pubkey.find_program_address(seeds, _ASSOCIATED_TOKEN_PROGRAM_ID)[0]


def spl_transfer_instruction(*, source: Pubkey, dest: Pubkey, owner: Pubkey, amount: int) -> Instruction:
    data = bytes([3]) + struct.pack("<Q", amount)
    return Instruction(
        program_id=_TOKEN_PROGRAM_ID,
        accounts=[
            AccountMeta(pubkey=source, is_signer=False, is_writable=True),
            AccountMeta(pubkey=dest, is_signer=False, is_writable=True),
            AccountMeta(pubkey=owner, is_signer=True, is_writable=False),
        ],
        data=data,
    )


async def get_balance(rpc: AsyncClient, pubkey: Pubkey, network: Network) -> dict:
    """Return SOL and USDC balances for the given pubkey."""
    sol_resp = await rpc.get_balance(pubkey)
    sol_lamports = sol_resp.value
    sol = sol_lamports / 1e9

    mint = usdc_mint(network)
    ata = get_associated_token_address(pubkey, mint)
    usdc = 0.0
    try:
        bal_resp = await rpc.get_token_account_balance(ata)
        if bal_resp.value is not None:
            usdc = float(bal_resp.value.ui_amount or 0.0)
    except Exception:
        usdc = 0.0

    return {
        "address": str(pubkey),
        "solBalance": sol,
        "usdcBalance": usdc,
        "usdcMint": str(mint),
    }


async def withdraw(
    *,
    rpc: AsyncClient,
    wallet: Keypair,
    authorized_pubkey: str,
    amount_sol: float,
    amount_usdc: float,
    dry_run: bool,
    network: Network,
) -> str:
    """Transfer SOL and/or USDC from hot wallet to authorized_pubkey. Returns tx signature."""
    if dry_run:
        return "dry-run"

    dest = Pubkey.from_string(authorized_pubkey)
    instructions: list[Instruction] = []

    if amount_sol > 0:
        lamports = int(amount_sol * 1e9)
        instructions.append(transfer(TransferParams(
            from_pubkey=wallet.pubkey(),
            to_pubkey=dest,
            lamports=lamports,
        )))

    if amount_usdc > 0:
        mint = usdc_mint(network)
        source_ata = get_associated_token_address(wallet.pubkey(), mint)
        dest_ata = get_associated_token_address(dest, mint)
        amount_raw = int(amount_usdc * 1_000_000)  # USDC has 6 decimals
        instructions.append(spl_transfer_instruction(
            source=source_ata,
            dest=dest_ata,
            owner=wallet.pubkey(),
            amount=amount_raw,
        ))

    if not instructions:
        raise ValueError("No transfer amounts specified")

    blockhash_resp = await rpc.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    msg = MessageV0.try_compile(
        payer=wallet.pubkey(),
        instructions=instructions,
        address_lookup_table_accounts=[],
        recent_blockhash=blockhash,
    )
    tx = VersionedTransaction(msg, [wallet])
    resp = await rpc.send_transaction(tx)
    return str(resp.value)
