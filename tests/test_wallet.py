"""Tests for dashboard wallet utilities."""
from __future__ import annotations

import struct

from solders.pubkey import Pubkey  # type: ignore

from src.dashboard.wallet import (
    USDC_MINT_MAINNET,
    USDC_MINT_DEVNET,
    get_associated_token_address,
    spl_transfer_instruction,
)


def test_usdc_mint_constants_are_valid_pubkeys():
    Pubkey.from_string(USDC_MINT_MAINNET)
    Pubkey.from_string(USDC_MINT_DEVNET)


def test_ata_derivation_is_deterministic():
    owner = Pubkey.from_string("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
    mint = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    ata1 = get_associated_token_address(owner, mint)
    ata2 = get_associated_token_address(owner, mint)
    assert ata1 == ata2


def test_ata_derivation_differs_by_owner():
    owner1 = Pubkey.from_string("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
    owner2 = Pubkey.from_string("So11111111111111111111111111111111111111112")
    mint = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    assert get_associated_token_address(owner1, mint) != get_associated_token_address(owner2, mint)


def test_spl_transfer_instruction_data_encoding():
    owner = Pubkey.from_string("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
    mint = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    source = get_associated_token_address(owner, mint)
    dest = get_associated_token_address(Pubkey.from_string("So11111111111111111111111111111111111111112"), mint)
    ix = spl_transfer_instruction(source=source, dest=dest, owner=owner, amount=1_000_000)
    assert ix.data[0] == 3
    assert len(ix.data) == 9
    assert struct.unpack("<Q", ix.data[1:])[0] == 1_000_000
