#!/usr/bin/env node
"use strict";

// Placeholder for Meteora TypeScript SDK bridge.
// Expected protocol:
// stdin:  {"method":"openPosition|closePosition|claimFees","params":{...}}
// stdout: {"signature":"..."}

process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input || "{}");
  } catch (err) {
    console.error(`Invalid JSON input: ${err.message}`);
    process.exit(1);
  }

  const method = payload.method;
  if (!method) {
    console.error("Missing 'method' in payload");
    process.exit(1);
  }

  console.error(
    `node-helper method '${method}' is not implemented yet. ` +
      "Wire this file to @meteora-ag/dlmm before running with DRY_RUN=false."
  );
  process.exit(1);
});
