#!/usr/bin/env node

/**
 * CPD ratchet check - fails if duplication threshold could be lowered
 *
 * Reads the current --min-tokens value from package.json's cpd script,
 * then runs jscpd with minTokens - 1 to check if the codebase
 * could pass with a stricter threshold. If it can, this check fails
 * to force updating the threshold.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

// Read current threshold from package.json cpd script (single source of truth)
const pkg = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf-8"));
const cpdScript = pkg.scripts.cpd;
const match = cpdScript.match(/--min-tokens\s+(\d+)/);
if (!match) {
  throw new Error("Could not find --min-tokens in package.json cpd script");
}
const CURRENT_MIN_TOKENS = Number(match[1]);
const RATCHET_MIN_TOKENS = CURRENT_MIN_TOKENS - 1;

// Paths matching the cpd script in package.json
const paths = ["src/_lib", "src/_data", "scripts", "packages"];
const ignorePatterns = [
  "**/index.js",
  "**/page-layouts/**",
  "**/customise-cms/**",
];

// Resolve jscpd from node_modules (not in system PATH)
const jscpdBin = join(ROOT_DIR, "node_modules", ".bin", "jscpd");

const result = spawnSync(
  jscpdBin,
  [
    ...paths,
    "--min-tokens",
    String(RATCHET_MIN_TOKENS),
    "--ignore",
    ignorePatterns.join(","),
  ],
  {
    cwd: ROOT_DIR,
    stdio: "inherit",
  },
);

if (result.error) {
  throw new Error(`Failed to run jscpd: ${result.error.message}`);
}

if (result.status === 0) {
  // jscpd passed with lower threshold - threshold can be tightened!
  console.error(
    `\n❌ CPD ratchet failed: code passed with minTokens=${RATCHET_MIN_TOKENS}`,
  );
  console.error(
    `   Update --min-tokens to ${RATCHET_MIN_TOKENS} in package.json cpd script`,
  );
  process.exit(1);
} else {
  // jscpd failed with lower threshold - current threshold is correct
  console.log(
    `\n✅ CPD ratchet passed: minTokens=${CURRENT_MIN_TOKENS} is correct`,
  );
  process.exit(0);
}
