"use strict";

const assert = require("assert");
const helper = require("./index.js");

const { uiAmountToBN, assertNonZeroAmounts } = helper._internal;

function run() {
  // Exact integer
  assert.strictEqual(uiAmountToBN("2", 6, "amountX").toString(10), "2000000");

  // Fractional precision preserved
  assert.strictEqual(uiAmountToBN("1.25", 6, "amountX").toString(10), "1250000");
  assert.strictEqual(uiAmountToBN("0.000001", 6, "amountY").toString(10), "1");

  // Zero value allowed
  assert.strictEqual(uiAmountToBN("0", 9, "amountX").toString(10), "0");

  // Reject too many decimals
  assert.throws(
    () => uiAmountToBN("0.0000001", 6, "amountY"),
    /too many decimal places/
  );

  // Reject scientific notation to avoid hidden precision surprises
  assert.throws(
    () => uiAmountToBN("1e-6", 6, "amountX"),
    /scientific notation/
  );

  // Reject negatives
  assert.throws(
    () => uiAmountToBN("-1", 6, "amountX"),
    /negative/
  );

  // Guard: both amounts zero must throw before hitting the RPC
  const BN = require("bn.js");
  assert.throws(
    () => assertNonZeroAmounts(new BN(0), new BN(0)),
    /both.*zero/i
  );
  // One non-zero is fine
  assertNonZeroAmounts(new BN(0), new BN(1));
  assertNonZeroAmounts(new BN(1), new BN(0));

  console.log("ok");
}

run();
