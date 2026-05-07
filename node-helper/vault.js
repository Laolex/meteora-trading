#!/usr/bin/env node
"use strict";

/**
 * Vault program client — builds raw Anchor transactions without the Anchor JS
 * framework so there are no IDL version compatibility issues.
 * Discriminators = sha256("global:<snake_name>")[0:8]
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const BN = require("bn.js");
const {
  getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} = require("@solana/spl-token");

// ── Constants ──────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("986ARRxoPAkVTAP4YcKyGMyyLm5736s3g2ZXp9aNqxFs");
const VAULT_SEED      = Buffer.from("vault");
const DEPOSITOR_SEED  = Buffer.from("depositor");
const SHARE_MINT_SEED = Buffer.from("share_mint");
const VAULT_USDC_SEED = Buffer.from("vault_usdc");

// Precomputed discriminators
const DISC = {
  initialize_vault: Buffer.from([48,191,163,44,71,129,63,164]),
  setup_share_mint: Buffer.from([17,9,202,237,204,226,237,57]),
  deposit:          Buffer.from([242,35,198,137,82,225,242,182]),
  withdraw:         Buffer.from([183,18,70,156,148,109,161,34]),
  manager_withdraw: Buffer.from([201,248,190,143,86,43,183,254]),
  manager_return:   Buffer.from([12,238,215,37,204,64,202,164]),
};

// ── PDA helpers ────────────────────────────────────────────────────────────────

function vaultPDA()     { return PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID); }
function shareMintPDA() { return PublicKey.findProgramAddressSync([SHARE_MINT_SEED], PROGRAM_ID); }
function vaultUsdcPDA() { return PublicKey.findProgramAddressSync([VAULT_USDC_SEED], PROGRAM_ID); }
function depositorPDA(depositorPubkey) {
  return PublicKey.findProgramAddressSync([DEPOSITOR_SEED, depositorPubkey.toBuffer()], PROGRAM_ID);
}

function u64LE(n) {
  const buf = Buffer.alloc(8);
  const bn = new BN(n.toString());
  bn.toArrayLike(Buffer, "le", 8).copy(buf);
  return buf;
}

// ── Setup ──────────────────────────────────────────────────────────────────────

function setup() {
  const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || process.env.SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error("Missing SOLANA_DEVNET_RPC_URL or SOLANA_RPC_URL");
  const keypairPath = process.env.HOT_WALLET_KEYPAIR_PATH;
  if (!keypairPath) throw new Error("Missing HOT_WALLET_KEYPAIR_PATH");
  const raw = JSON.parse(fs.readFileSync(path.resolve(keypairPath), "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  const connection = new Connection(rpcUrl, "confirmed");
  return { connection, keypair };
}

async function sendTx(connection, keypair, instructions) {
  const tx = new Transaction().add(...instructions);
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: "confirmed" });
  return sig;
}

// ── Commands ───────────────────────────────────────────────────────────────────

async function initializeVault(args) {
  const depositCapMicro = new BN(args.deposit_cap_usdc || 10000).mul(new BN(1_000_000));
  const usdcMint = new PublicKey(args.usdc_mint);
  const { connection, keypair } = setup();
  const [vault] = vaultPDA();
  const [vaultUsdc] = vaultUsdcPDA();
  const [shareMint] = shareMintPDA();

  // Step 1: vault state + vault_usdc
  const data1 = Buffer.concat([DISC.initialize_vault, u64LE(depositCapMicro)]);
  const ix1 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: usdcMint,                isSigner: false, isWritable: false },
      { pubkey: vault,                   isSigner: false, isWritable: true  },
      { pubkey: vaultUsdc,               isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,      isSigner: false, isWritable: false },
    ],
    data: data1,
  });
  const sig1 = await sendTx(connection, keypair, [ix1]);

  // Step 2: share mint
  const ix2 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: vault,                   isSigner: false, isWritable: true  },
      { pubkey: shareMint,               isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,      isSigner: false, isWritable: false },
    ],
    data: DISC.setup_share_mint,
  });
  const sig2 = await sendTx(connection, keypair, [ix2]);

  return {
    step1: sig1, step2: sig2,
    vault: vault.toBase58(), shareMint: shareMint.toBase58(), vaultUsdc: vaultUsdc.toBase58(),
  };
}

async function getVaultState() {
  const { connection } = setup();
  const [vault] = vaultPDA();
  const [vaultUsdc] = vaultUsdcPDA();
  const [shareMint] = shareMintPDA();

  const accountInfo = await connection.getAccountInfo(vault);
  if (!accountInfo) return { initialized: false };

  // Parse Vault account: 8 disc + 32 manager + 32 usdcMint + 32 vaultUsdc + 32 shareMint
  //                     + 8 totalShares + 8 navPerShare + 8 depositCap + 8 managerWithdrawn + 1 bump
  const d = accountInfo.data;
  let offset = 8; // skip discriminator
  const manager    = new PublicKey(d.slice(offset, offset + 32)).toBase58(); offset += 32;
  const usdcMint   = new PublicKey(d.slice(offset, offset + 32)).toBase58(); offset += 32;
  const vaultUsdcK = new PublicKey(d.slice(offset, offset + 32)).toBase58(); offset += 32;
  const shareMintK = new PublicKey(d.slice(offset, offset + 32)).toBase58(); offset += 32;
  const totalShares      = BigInt("0x" + Buffer.from(d.slice(offset, offset+8)).reverse().toString("hex")); offset += 8;
  const navPerShare      = BigInt("0x" + Buffer.from(d.slice(offset, offset+8)).reverse().toString("hex")); offset += 8;
  const depositCap       = BigInt("0x" + Buffer.from(d.slice(offset, offset+8)).reverse().toString("hex")); offset += 8;
  const managerWithdrawn = BigInt("0x" + Buffer.from(d.slice(offset, offset+8)).reverse().toString("hex")); offset += 8;

  let vaultBalanceMicro = 0n;
  try {
    const tb = await connection.getTokenAccountBalance(vaultUsdc);
    vaultBalanceMicro = BigInt(tb.value.amount);
  } catch {}

  const totalAumMicro = vaultBalanceMicro + managerWithdrawn;

  return {
    initialized: true,
    vault: vault.toBase58(),
    shareMint: shareMint.toBase58(),
    vaultUsdc: vaultUsdc.toBase58(),
    manager, usdcMint,
    totalShares: totalShares.toString(),
    navPerShare: navPerShare.toString(),
    navPerShareUsd: Number(navPerShare) / 1_000_000,
    depositCap: depositCap.toString(),
    depositCapUsd: Number(depositCap) / 1_000_000,
    managerWithdrawn: managerWithdrawn.toString(),
    vaultBalanceMicro: vaultBalanceMicro.toString(),
    totalAumUsd: Number(totalAumMicro) / 1_000_000,
  };
}

async function setupShareMintOnly() {
  const { connection, keypair } = setup();
  const [vault] = vaultPDA();
  const [shareMint] = shareMintPDA();
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: vault,                   isSigner: false, isWritable: true  },
      { pubkey: shareMint,               isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,      isSigner: false, isWritable: false },
    ],
    data: DISC.setup_share_mint,
  });
  const sig = await sendTx(connection, keypair, [ix]);
  return { signature: sig, shareMint: shareMint.toBase58() };
}

async function managerWithdraw(args) {
  const amountMicro = BigInt(args.amount_micro.toString());
  const { connection, keypair } = setup();
  const [vault] = vaultPDA();
  const [vaultUsdc] = vaultUsdcPDA();

  const state = await getVaultState();
  const usdcMint = new PublicKey(state.usdcMint);
  const managerUsdc = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

  const data = Buffer.concat([DISC.manager_withdraw, u64LE(amountMicro)]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: vault,             isSigner: false, isWritable: true  },
      { pubkey: vaultUsdc,         isSigner: false, isWritable: true  },
      { pubkey: managerUsdc,       isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
    ],
    data,
  });

  const sig = await sendTx(connection, keypair, [ix]);
  return { signature: sig, amountMicro: amountMicro.toString() };
}

async function managerReturn(args) {
  const amountMicro = BigInt(args.amount_micro.toString());
  const { connection, keypair } = setup();
  const [vault] = vaultPDA();
  const [vaultUsdc] = vaultUsdcPDA();

  const state = await getVaultState();
  const usdcMint = new PublicKey(state.usdcMint);
  const managerUsdc = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

  const data = Buffer.concat([DISC.manager_return, u64LE(amountMicro)]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: vault,             isSigner: false, isWritable: true  },
      { pubkey: vaultUsdc,         isSigner: false, isWritable: true  },
      { pubkey: managerUsdc,       isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
    ],
    data,
  });

  const sig = await sendTx(connection, keypair, [ix]);
  return { signature: sig, amountMicro: amountMicro.toString() };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  let args = {};
  const stdin = await new Promise((resolve) => {
    let buf = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
  if (stdin.trim()) args = JSON.parse(stdin);

  let result;
  switch (command) {
    case "initialize-vault":  result = await initializeVault(args); break;
    case "get-state":         result = await getVaultState();       break;
    case "manager-withdraw":  result = await managerWithdraw(args); break;
    case "manager-return":    result = await managerReturn(args);   break;
    // exposed separately in case step 1 succeeded but step 2 failed
    case "setup-share-mint":  result = await setupShareMintOnly(args); break;
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      process.exit(1);
  }

  process.stdout.write(JSON.stringify(result) + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
