#!/usr/bin/env node

/**
 * CPD ratchet check - fails when a duplication threshold could be lower.
 *
 * Guards both duplication thresholds the repository records:
 *   - the strict jscpd invocation read out of package.json's cpd script
 *     (paths, ignores and --min-tokens all come from that single source,
 *     so the ratchet can never drift from the real check)
 *   - the config-driven default scan's minTokens in .jscpd.json
 *
 * Each threshold is re-run with its value lowered by one. A clean run
 * at the stricter value means the threshold can be tightened, and this
 * check fails until the recorded value is updated.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { loadCpdDuplicates, runJscpd } from "#scripts/cpd.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";
import { printRatchetPassed } from "#scripts/lib/ratchet.js";

const RATCHET_OUTPUT_DIR = join(ROOT_DIR, ".jscpd-report", "ratchet");
const RATCHET_REPORT = join(RATCHET_OUTPUT_DIR, "jscpd-report.json");
const CONFIG_RATCHET_OUTPUT_DIR = join(
  ROOT_DIR,
  ".jscpd-report",
  "ratchet-config",
);
const CONFIG_RATCHET_REPORT = join(
  CONFIG_RATCHET_OUTPUT_DIR,
  "jscpd-report.json",
);

/**
 * Extract the strict jscpd invocation's CLI args from the cpd npm script.
 * The cpd script runs the whole-tree scan plus one argument-based scan per
 * production concern (strict, near-miss, fp, design-system). The strict
 * one is the min-tokens segment that carries --ignore-pattern (the fp and
 * design-system scans do not) and lacks the near-miss flags.
 * @param {string} cpdScript
 * @returns {string[]}
 */
export const parseCpdArgs = (cpdScript) => {
  const segments = cpdScript.split("&&").map((segment) => segment.trim());
  const strict = segments.filter(
    (segment) =>
      segment.includes("--min-tokens") &&
      segment.includes("--ignore-pattern") &&
      !segment.includes("--ignore-identifiers"),
  );
  if (strict.length !== 1) {
    throw new Error(
      `Expected exactly one strict (--ignore-pattern, non-near) --min-tokens segment in the cpd script, found ${strict.length}: ${cpdScript}`,
    );
  }

  const tokens = strict[0].match(/'[^']*'|\S+/g);
  if (!tokens || tokens[0] !== "node" || tokens[1] !== "scripts/cpd.js") {
    throw new Error(
      `The strict cpd segment no longer starts with "node scripts/cpd.js" - update scripts/cpd-ratchet.js to match: ${strict[0]}`,
    );
  }
  return tokens.slice(2).map((token) => token.replaceAll("'", ""));
};

/**
 * Return the current --min-tokens value and the same args with it
 * lowered by one.
 * @param {string[]} args
 * @returns {{ current: number, ratchetArgs: string[] }}
 */
export const lowerMinTokens = (args) => {
  const index = args.indexOf("--min-tokens");
  const current = index === -1 ? Number.NaN : Number(args[index + 1]);
  if (!Number.isInteger(current) || current < 2) {
    throw new Error(
      `Could not read a --min-tokens value above 1 from: ${args.join(" ")}`,
    );
  }
  const ratchetArgs = [...args];
  ratchetArgs[index + 1] = String(current - 1);
  return { current, ratchetArgs };
};

/**
 * Validate and return a config's recorded minTokens threshold.
 * @param {{ minTokens?: unknown }} config - parsed .jscpd.json content
 * @returns {number}
 */
export const configMinTokens = (config) => {
  const { minTokens } = config;
  if (
    typeof minTokens !== "number" ||
    !Number.isInteger(minTokens) ||
    minTokens < 2
  ) {
    throw new Error(
      `.jscpd.json must record an integer minTokens above 1 - found ${JSON.stringify(minTokens)}`,
    );
  }
  return minTokens;
};

/**
 * Read the config-driven default scan's minTokens out of .jscpd.json.
 * @returns {number}
 */
export const readConfigMinTokens = () =>
  configMinTokens(
    JSON.parse(readFileSync(join(ROOT_DIR, ".jscpd.json"), "utf-8")),
  );

/**
 * Guard one recorded threshold: run the scan it protects with the
 * threshold lowered by one. A clean run means the threshold can be
 * tightened, which fails the ratchet naming where to update it; any
 * other non-zero exit must have produced duplicates (or the run itself
 * crashed, which loadCpdDuplicates throws on). Returns the duplicates
 * found one notch lower for the pass message.
 * @param {number} threshold - the recorded min-tokens value being guarded
 * @param {string[]} ratchetArgs - jscpd args reproducing the guarded scan at threshold - 1
 * @param {string} outputDir - report destination for this ratchet run
 * @param {string} reportPath - JSON report path inside outputDir
 * @param {string} fixLocation - where to update the threshold on failure
 * @returns {object[]}
 */
const guardThreshold = (
  threshold,
  ratchetArgs,
  outputDir,
  reportPath,
  fixLocation,
) => {
  const status = runJscpd(
    [...ratchetArgs, "--silent", "--output", outputDir],
    reportPath,
  );

  if (status === 0) {
    console.error(
      `\n❌ CPD ratchet failed: the code passes with min-tokens ${threshold - 1}`,
    );
    console.error(`   Update ${fixLocation} to ${threshold - 1}`);
    process.exit(1);
  }

  return loadCpdDuplicates(reportPath);
};

/**
 * Run the ratchet: exported so the unit tests can drive it with mocks.
 */
export const main = () => {
  const pkg = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf-8"));
  const { current, ratchetArgs } = lowerMinTokens(
    parseCpdArgs(pkg.scripts.cpd),
  );
  const duplicates = guardThreshold(
    current,
    ratchetArgs,
    RATCHET_OUTPUT_DIR,
    RATCHET_REPORT,
    "--min-tokens in the package.json cpd script",
  );
  printRatchetPassed(
    `CPD ratchet passed: min-tokens ${current} is as strict as the code allows (${duplicates.length} clone(s) appear one notch lower)`,
  );

  const configTokens = readConfigMinTokens();
  const configDuplicates = guardThreshold(
    configTokens,
    ["--min-tokens", String(configTokens - 1)],
    CONFIG_RATCHET_OUTPUT_DIR,
    CONFIG_RATCHET_REPORT,
    "minTokens in .jscpd.json",
  );
  const configPassMessage = `CPD ratchet passed: config min-tokens ${configTokens} is as strict as the code allows (${configDuplicates.length} clone(s) appear one notch lower)`;
  printRatchetPassed(configPassMessage);
};

await runIfMain(import.meta.url, main);
