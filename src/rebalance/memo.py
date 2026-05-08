"""
On-chain decision receipts via SPL Memo program.
Every REBALANCE or EXIT action writes a compact memo to Solana — a verifiable
audit trail that anyone can inspect on a block explorer.
In DRY_RUN mode the memo is only logged, never broadcast.
"""
from __future__ import annotations

import logging

log = logging.getLogger(__name__)

MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
_MAX_BYTES = 480  # well under the 566-byte SPL Memo limit


def build_memo_text(action_type: str, pool_address: str, reason: str) -> str:
    short_pool = pool_address[:8]
    short_reason = reason[:120].replace("|", "/")
    text = f"METEORA|v1|action={action_type}|pool={short_pool}|{short_reason}"
    return text[:_MAX_BYTES]


async def send_memo(rpc, wallet, memo_text: str, dry_run: bool) -> str | None:
    """Send a memo instruction. Returns tx signature or None on failure/dry-run."""
    if dry_run:
        log.info("DRY_RUN memo receipt: %s", memo_text)
        return None
    try:
        from solders.instruction import Instruction, AccountMeta  # type: ignore
        from solders.pubkey import Pubkey  # type: ignore
        from solders.message import MessageV0  # type: ignore
        from solders.transaction import VersionedTransaction  # type: ignore

        memo_pk = Pubkey.from_string(MEMO_PROGRAM)
        ix = Instruction(
            program_id=memo_pk,
            accounts=[AccountMeta(pubkey=wallet.pubkey(), is_signer=True, is_writable=False)],
            data=memo_text.encode("utf-8"),
        )
        blockhash_resp = await rpc.get_latest_blockhash()
        blockhash = blockhash_resp.value.blockhash
        msg = MessageV0.try_compile(wallet.pubkey(), [ix], [], blockhash)
        tx = VersionedTransaction(msg, [wallet])
        resp = await rpc.send_transaction(tx)
        sig = str(resp.value)
        log.info("On-chain receipt sent: %s", sig)
        return sig
    except Exception as exc:
        log.warning("Memo receipt failed (non-blocking): %s", exc)
        return None
