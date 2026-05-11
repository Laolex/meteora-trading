#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { Connection, Keypair, PublicKey, sendAndConfirmTransaction } = require("@solana/web3.js");
const BN = require("bn.js");
const anchor = require("@coral-xyz/anchor");
const DLMM = require("@meteora-ag/dlmm");

function fail(message, extra = {}) {
  const err = { error: message, ...extra };
  process.stderr.write(`${message}\n`);
  if (Object.keys(extra).length > 0) {
    process.stderr.write(`${JSON.stringify(extra)}\n`);
  }
  process.exitCode = 1;
  return err;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", reject);
  });
}

function parseJsonOrThrow(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (err) {
    throw new Error(`Invalid JSON input: ${err.message}`);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function loadKeypairFromPath(filePath) {
  const abs = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(raw) || raw.length < 64) {
    throw new Error(`Invalid keypair file: ${abs}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function getPositionMapPath() {
  return process.env.NODE_HELPER_POSITION_MAP_PATH || "/tmp/meteora-node-positions.json";
}

function loadPositionMap() {
  const filePath = getPositionMapPath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function savePositionMap(map) {
  const filePath = getPositionMapPath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
}

function mockSignature() {
  return `MOCK_SIG_${crypto.randomBytes(16).toString("hex")}`;
}

function mockPositionPubkey(clientPositionId) {
  const hash = crypto.createHash("sha256").update(clientPositionId).digest("hex").slice(0, 24);
  return `MOCK_POS_${hash}`;
}

function ensureMethodAndParams(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object");
  }
  if (!payload.method) {
    throw new Error("Missing 'method' in payload");
  }
  if (!payload.params || typeof payload.params !== "object") {
    throw new Error("Missing 'params' object in payload");
  }
}

function requireParam(params, key) {
  const value = params[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required param: ${key}`);
  }
  return value;
}

function strategyFromParams(params) {
  const minBinId = Number(requireParam(params, "lowerBinId"));
  const maxBinId = Number(requireParam(params, "upperBinId"));
  if (!Number.isFinite(minBinId) || !Number.isFinite(maxBinId) || minBinId > maxBinId) {
    throw new Error(`Invalid bin range: lowerBinId=${params.lowerBinId} upperBinId=${params.upperBinId}`);
  }
  return { minBinId, maxBinId };
}

function validateDecimals(decimals, label) {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid ${label} decimals: ${decimals}`);
  }
}

function assertNonZeroAmounts(totalXAmount, totalYAmount) {
  if (totalXAmount.isZero() && totalYAmount.isZero()) {
    throw new Error("both amountX and amountY are zero — no liquidity would be deposited");
  }
}

function uiAmountToBN(value, decimals, label) {
  validateDecimals(decimals, label);

  const raw = typeof value === "number" ? String(value) : String(value || "").trim();
  if (!raw) {
    throw new Error(`Invalid ${label} value: empty`);
  }
  if (raw.startsWith("-")) {
    throw new Error(`Invalid ${label} value: negative`);
  }
  if (/[eE]/.test(raw)) {
    throw new Error(`Invalid ${label} value '${raw}': scientific notation is not allowed`);
  }
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid ${label} value '${raw}': expected digits with optional decimal point`);
  }

  const [intPart, fracPart = ""] = raw.split(".");
  if (fracPart.length > decimals) {
    throw new Error(
      `Invalid ${label} value '${raw}': too many decimal places (got ${fracPart.length}, max ${decimals})`
    );
  }

  const baseUnits = `${intPart}${fracPart.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return new BN(baseUnits || "0", 10);
}

function dlmmStrategyType() {
  return anchor.BN ? 0 : 0;
}

async function makeContext() {
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.SOLANA_DEVNET_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing SOLANA_RPC_URL or SOLANA_DEVNET_RPC_URL");
  }

  const keypairPath = requiredEnv("HOT_WALLET_KEYPAIR_PATH");
  const walletKp = loadKeypairFromPath(keypairPath);
  const connection = new Connection(rpcUrl, "confirmed");

  return {
    connection,
    owner: walletKp,
  };
}

async function openPositionReal(params) {
  const poolAddress = new PublicKey(requireParam(params, "poolAddress"));
  const clientPositionId = String(requireParam(params, "clientPositionId"));
  const { minBinId, maxBinId } = strategyFromParams(params);

  const { connection, owner } = await makeContext();
  const dlmm = await DLMM.create(connection, poolAddress);

  const tokenXDecimals = Number(dlmm.tokenX?.mint?.decimals);
  const tokenYDecimals = Number(dlmm.tokenY?.mint?.decimals);
  const totalXAmount = uiAmountToBN(requireParam(params, "amountX"), tokenXDecimals, "amountX");
  const totalYAmount = uiAmountToBN(requireParam(params, "amountY"), tokenYDecimals, "amountY");
  assertNonZeroAmounts(totalXAmount, totalYAmount);
  const positionKeypair = Keypair.generate();

  const strategy = {
    minBinId,
    maxBinId,
    strategyType: dlmmStrategyType(),
  };

  const tx = await dlmm.initializePositionAndAddLiquidityByStrategy({
    positionPubKey: positionKeypair.publicKey,
    user: owner.publicKey,
    totalXAmount,
    totalYAmount,
    strategy,
  });

  const txList = Array.isArray(tx) ? tx : [tx];
  let signature = null;
  for (const oneTx of txList) {
    signature = await sendAndConfirmTransaction(connection, oneTx, [owner, positionKeypair], { skipPreflight: true, confirmTransactionInitialTimeout: 120000 });
  }

  if (!signature) {
    throw new Error("openPosition did not return a signature");
  }

  const map = loadPositionMap();
  map[clientPositionId] = positionKeypair.publicKey.toBase58();
  savePositionMap(map);

  return {
    signature,
    positionPubkey: positionKeypair.publicKey.toBase58(),
  };
}

async function closePositionReal(params) {
  const poolAddress = new PublicKey(requireParam(params, "poolAddress"));
  const positionId = String(requireParam(params, "positionId"));

  const map = loadPositionMap();
  const positionPubkeyStr = map[positionId] || positionId;
  const positionPubkey = new PublicKey(positionPubkeyStr);

  const { connection, owner } = await makeContext();
  const dlmm = await DLMM.create(connection, poolAddress);

  // Workaround: dlmm.closePosition expects position.positionData and position.publicKey,
  // but passing a raw PublicKey fails with "Account position not provided" in SDK 0.11.0.
  // We fetch and wrap the decoded position account to satisfy the SDK's property access.
  const decodedPosition = await dlmm.program.account.positionV2.fetch(positionPubkey);
  const wrappedPosition = { publicKey: positionPubkey, ...decodedPosition };
  const lowerBinId = Number(decodedPosition.lowerBinId?.toString?.() ?? decodedPosition.lowerBinId);
  const upperBinId = Number(decodedPosition.upperBinId?.toString?.() ?? decodedPosition.upperBinId);
  if (!Number.isFinite(lowerBinId) || !Number.isFinite(upperBinId)) {
    throw new Error(`Invalid position bin range for ${positionPubkeyStr}`);
  }

  // ClosePosition2 fails for non-empty positions; remove liquidity and close in one flow.
  const txList = await dlmm.removeLiquidity({
    user: owner.publicKey,
    position: wrappedPosition.publicKey,
    fromBinId: lowerBinId,
    toBinId: upperBinId,
    bps: new BN(10000),
    shouldClaimAndClose: true,
  });

  let signature = null;
  for (const oneTx of (Array.isArray(txList) ? txList : [txList])) {
    signature = await sendAndConfirmTransaction(connection, oneTx, [owner]);
  }

  if (!signature) {
    throw new Error("closePosition did not return a signature");
  }

  return { signature };
}

async function claimFeesReal(params) {
  const poolAddress = new PublicKey(requireParam(params, "poolAddress"));
  const positionId = String(requireParam(params, "positionId"));

  const map = loadPositionMap();
  const positionPubkeyStr = map[positionId] || positionId;
  const positionPubkey = new PublicKey(positionPubkeyStr);

  const { connection, owner } = await makeContext();
  const dlmm = await DLMM.create(connection, poolAddress);

  // SDK claimSwapFee requires the full position object (with positionData),
  // not just a pubkey. Fetch all positions and find the matching one.
  const { userPositions } = await dlmm.getPositionsByUserAndLbPair(owner.publicKey);
  const positionObj = userPositions.find(
    (p) => p.publicKey.toBase58() === positionPubkey.toBase58()
  );
  if (!positionObj) {
    throw new Error(`Position ${positionPubkeyStr} not found in pool ${poolAddress.toBase58()}`);
  }

  if (
    positionObj.positionData.feeX.isZero() &&
    positionObj.positionData.feeY.isZero()
  ) {
    // No fees to claim — not an error, just a no-op
    return { signature: "NO_FEES" };
  }

  const tx = await dlmm.claimSwapFee({
    owner: owner.publicKey,
    position: positionObj,
  });

  const txList = Array.isArray(tx) ? tx : [tx];
  let signature = null;
  for (const oneTx of txList) {
    signature = await sendAndConfirmTransaction(connection, oneTx, [owner]);
  }

  if (!signature) {
    throw new Error("claimFees did not return a signature");
  }

  return { signature };
}

function openPositionMock(params) {
  const clientPositionId = String(requireParam(params, "clientPositionId"));
  const positionPubkey = mockPositionPubkey(clientPositionId);
  const map = loadPositionMap();
  map[clientPositionId] = positionPubkey;
  savePositionMap(map);
  return { signature: mockSignature(), positionPubkey };
}

function closePositionMock(params) {
  const positionId = String(requireParam(params, "positionId"));
  const map = loadPositionMap();
  if (!map[positionId]) {
    throw new Error(`Unknown positionId mapping: ${positionId}`);
  }
  return { signature: mockSignature() };
}

function claimFeesMock(params) {
  const positionId = String(requireParam(params, "positionId"));
  const map = loadPositionMap();
  if (!map[positionId]) {
    throw new Error(`Unknown positionId mapping: ${positionId}`);
  }
  return { signature: mockSignature() };
}

async function getActiveBinReal(params) {
  const poolAddress = new PublicKey(requireParam(params, "poolAddress"));
  const { connection } = await makeContext();
  const dlmm = await DLMM.create(connection, poolAddress);
  return { activeBinId: dlmm.lbPair.activeId };
}

async function dispatch(payload) {
  ensureMethodAndParams(payload);
  const { method, params } = payload;
  const useMock = process.env.NODE_HELPER_MOCK === "true";

  if (method === "openPosition") {
    return useMock ? openPositionMock(params) : await openPositionReal(params);
  }
  if (method === "closePosition") {
    return useMock ? closePositionMock(params) : await closePositionReal(params);
  }
  if (method === "claimFees") {
    return useMock ? claimFeesMock(params) : await claimFeesReal(params);
  }
  if (method === "getActiveBin") {
    return await getActiveBinReal(params);
  }

  throw new Error(`Unsupported method '${method}'`);
}

async function main() {
  try {
    const raw = await readStdin();
    const payload = parseJsonOrThrow(raw);
    const result = await dispatch(payload);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (err) {
    fail(err.message || String(err));
  }
}

module.exports = {
  _internal: {
    uiAmountToBN,
    validateDecimals,
    assertNonZeroAmounts,
  },
};

if (require.main === module) {
  main();
}
