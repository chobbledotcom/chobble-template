#!/usr/bin/env node
/**
 * Strict typecheck ratchet - prevents strict type error regressions.
 *
 * Runs `tsc -p tsconfig.strict.json` and compares the reported errors
 * against the per-file baseline below:
 *   - files not listed must stay strict-clean (new files start clean)
 *   - a listed file must not exceed its baseline count
 *   - fewer errors than the baseline also fails, printing the corrected
 *     baseline ready to paste, so every win is locked in
 *
 * The baseline is the complete map of remaining strict debt. It is empty:
 * the whole codebase is strict-clean, and every file must stay that way.
 */

import { runIfMain } from "#scripts/lib/is-main-module.js";
import { printRatchetPassed } from "#scripts/lib/ratchet.js";
import { runToolCapture } from "#scripts/lib/run-tool.js";
import { frozenObject } from "#utils/fp/object.js";

const STRICT_ERROR_BASELINE = frozenObject({});

/** Matches one `path(line,col): error TScode: message` diagnostic line. */
const ERROR_LINE = /^(.+?)\(\d+,\d+\): error TS\d+: /;

/**
 * Append one diagnostic line to its file's bucket.
 * @param {Map<string, string[]>} errorsByFile
 * @param {string} file
 * @param {string} line
 */
const recordError = (errorsByFile, file, line) => {
  const existing = errorsByFile.get(file);
  if (existing) existing.push(line);
  else errorsByFile.set(file, [line]);
};

/**
 * Group tsc diagnostic lines by the file they point at.
 * An "error TS" line with no file prefix is a project-level failure (bad
 * tsconfig, missing dependency), not type debt - those throw instead of
 * counting against the baseline.
 * @param {string} output
 * @returns {Map<string, string[]>}
 */
export const parseErrorsByFile = (output) => {
  const errorsByFile = new Map();
  for (const line of output.split("\n")) {
    const match = line.match(ERROR_LINE);
    if (match) {
      recordError(errorsByFile, match[1], line);
    } else if (line.includes("error TS")) {
      throw new Error(`tsc reported a project-level error: ${line}`);
    }
  }
  return errorsByFile;
};

/**
 * Compare actual per-file error counts against the baseline.
 * Also covers baseline entries for deleted or no-longer-checked files:
 * they report zero actual errors, so they surface as improvements and
 * force a baseline update.
 * @param {Map<string, string[]>} errorsByFile
 * @param {Record<string, number>} baseline
 */
export const compareToBaseline = (errorsByFile, baseline) => {
  const files = new Set([...errorsByFile.keys(), ...Object.keys(baseline)]);
  const compared = [...files].sort().map((file) => {
    const lines = errorsByFile.get(file);
    return {
      file,
      actual: lines ? lines.length : 0,
      allowed: file in baseline ? baseline[file] : 0,
    };
  });
  return {
    regressions: compared.filter(({ actual, allowed }) => actual > allowed),
    improvements: compared.filter(({ actual, allowed }) => actual < allowed),
  };
};

/**
 * Render the ready-to-paste baseline literal for the current errors.
 * @param {Map<string, string[]>} errorsByFile
 */
export const formatBaseline = (errorsByFile) => {
  const entries = [...errorsByFile.entries()]
    .map(([file, lines]) => `  "${file}": ${lines.length},`)
    .sort()
    .join("\n");
  return `const STRICT_ERROR_BASELINE = frozenObject({\n${entries}\n});`;
};

/**
 * @param {{ file: string, actual: number, allowed: number }[]} regressions
 * @param {Map<string, string[]>} errorsByFile
 * @returns {string[]}
 */
export const describeRegressions = (regressions, errorsByFile) => [
  `\n❌ Strict type errors above baseline in ${regressions.length} file(s):`,
  ...regressions.flatMap(({ file, actual, allowed }) => {
    const lines = errorsByFile.get(file);
    if (!lines) throw new Error(`No recorded errors for ${file}`);
    return [
      `\n   ${file}: ${actual} error(s), baseline ${allowed}`,
      ...lines.map((line) => `      ${line}`),
    ];
  }),
  "\n   Fix the new errors (JSDoc annotations usually suffice) -",
  "   the baseline only ever goes down.",
];

/**
 * @param {{ file: string, actual: number, allowed: number }[]} improvements
 * @param {Map<string, string[]>} errorsByFile
 * @returns {string[]}
 */
export const describeImprovements = (improvements, errorsByFile) => [
  `\n🎉 Strict errors dropped below baseline in ${improvements.length} file(s):`,
  ...improvements.map(
    ({ file, actual, allowed }) =>
      `   ${file}: ${actual} (baseline ${allowed})`,
  ),
  "\n   Lock the win in - replace STRICT_ERROR_BASELINE in",
  "   scripts/strict-typecheck-ratchet.js with:\n",
  formatBaseline(errorsByFile),
];

/**
 * Run the strict tsc project and return its combined output.
 * A non-zero exit with no diagnostics means tsc itself broke - throw
 * rather than reporting a clean ratchet.
 */
export const runStrictTsc = () => {
  const { status, output } = runToolCapture("npx", [
    "tsc",
    "--noEmit",
    "-p",
    "tsconfig.strict.json",
    "--pretty",
    "false",
    "--incremental",
    "--tsBuildInfoFile",
    "tsconfig.strict.tsbuildinfo",
  ]);
  if (status !== 0 && !output.includes("error TS")) {
    throw new Error(`tsc exited ${status} without diagnostics:\n${output}`);
  }
  return output;
};

/**
 * Run the ratchet against a baseline (the real one by default; tests
 * inject a small one) and report, exiting non-zero on any mismatch.
 * @param {Record<string, number>} [baseline]
 */
export const main = (baseline = STRICT_ERROR_BASELINE) => {
  const errorsByFile = parseErrorsByFile(runStrictTsc());
  const { regressions, improvements } = compareToBaseline(
    errorsByFile,
    baseline,
  );
  const problems = [
    ...(regressions.length > 0
      ? describeRegressions(regressions, errorsByFile)
      : []),
    ...(improvements.length > 0
      ? describeImprovements(improvements, errorsByFile)
      : []),
  ];
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }

  const total = [...errorsByFile.values()].reduce(
    (sum, lines) => sum + lines.length,
    0,
  );
  printRatchetPassed(
    `Strict typecheck ratchet passed: ${total} known errors across ${errorsByFile.size} files, everything else strict-clean`,
  );
};

await runIfMain(import.meta.url, main);
