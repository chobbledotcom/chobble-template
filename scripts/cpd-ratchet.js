#!/usr/bin/env node
/**
 * CPD ratchet check - fails if duplication threshold could be lowered
 *
 * This script runs jscpd with minTokens - 1 to check if the codebase
 * could pass with a stricter threshold. If it can, this check fails
 * to force updating the threshold.
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";

// Current threshold from package.json cpd script
const CURRENT_MIN_TOKENS = 23;
const RATCHET_MIN_TOKENS = CURRENT_MIN_TOKENS - 1;

// Paths matching the cpd script in package.json
const paths = ["src/_lib", "src/_data", "scripts", "packages"];
const ignorePatterns = [
  "**/index.js",
  "**/page-layouts/**",
  "**/customise-cms/**",
];

const result = spawnSync(
  "jscpd",
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

if (result.status === 0) {
  // jscpd passed with lower threshold - threshold can be tightened!
  console.error(
    `\n❌ CPD ratchet failed: code passed with minTokens=${RATCHET_MIN_TOKENS}`,
  );
  console.error(
    `   Update --min-tokens to ${RATCHET_MIN_TOKENS} in package.json cpd script`,
  );
  console.error(
    `   and CURRENT_MIN_TOKENS to ${RATCHET_MIN_TOKENS} in scripts/cpd-ratchet.js`,
  );
  process.exit(1);
} else {
  // jscpd failed with lower threshold - current threshold is correct
  console.log(
    `\n✅ CPD ratchet passed: minTokens=${CURRENT_MIN_TOKENS} is correct`,
  );
  process.exit(0);
}
