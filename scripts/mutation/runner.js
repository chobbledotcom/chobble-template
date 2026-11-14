/**
 * Mutation test runner.
 *
 * For each mutant we write the mutated source over the real file, run the
 * mapped test files in a fresh `vitest run` subprocess, then restore the
 * original. Mutating in place (rather than in a temp copy) is what makes
 * mutations bind through this project's `#…` import aliases — a fresh
 * subprocess re-imports the changed file, so the tests run against the mutant.
 *
 * A mutant is "killed" when the tests fail, "survived" when they still pass
 * (a gap in the tests), or "timed-out" when the mutation caused a hang (which
 * counts as detected).
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { dim, green, red, write, yellow } from "#scripts/lib/colors.js";
import { applyMutant, generateMutants } from "#scripts/mutation/generate.js";
import {
  ignoreListProblems,
  isIgnored,
  loadIgnoreList,
} from "#scripts/mutation/ignore.js";
import {
  formatSummaryLines,
  rel,
  summarize,
  writeStepSummary,
} from "#scripts/mutation/summary.js";

const BASELINE_TIMEOUT = 120_000;
const TIMEOUT_MULTIPLIER = 3;

/** @typedef {import("#scripts/mutation/generate.js").Mutant} Mutant */
/** @typedef {import("#scripts/mutation/summary.js").MutantResult} MutantResult */
/** @typedef {{ entries: string[], keys: Set<string> }} IgnoreList */

/**
 * @typedef {Object} MutationRunContext
 * @property {AbortSignal} abortSignal
 * @property {boolean} exhaustive
 * @property {IgnoreList} ignoreList
 * @property {() => boolean} isAborted
 * @property {Map<string, string>} originals
 * @property {() => void} restoreAll
 * @property {MutantResult[]} results
 * @property {string[]} sourceFiles
 * @property {string[]} testFiles
 * @property {number} timeout
 */

/** @returns {MutantResult[]} */
const newResults = () => [];

/**
 * Run the test files once, returning the outcome and how long it took.
 * @param {string[]} testFiles
 * @param {number} timeoutMs
 * @param {AbortSignal} abortSignal
 * @returns {Promise<{ durationMs: number, outcome: "passed" | "failed" | "timed-out" }>}
 */
const runTests = (testFiles, timeoutMs, abortSignal) =>
  new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let timedOut = false;
    controller.signal.addEventListener("abort", () => {
      timedOut = true;
    });
    const onAbort = () => controller.abort();
    if (abortSignal?.aborted) controller.abort();
    else abortSignal?.addEventListener("abort", onAbort, { once: true });

    const startedAt = performance.now();
    // SIGKILL (not the default SIGTERM) so an aborted run dies promptly and
    // fires `close` quickly — a test that ignored SIGTERM could otherwise keep
    // the process (and its open handles on the source file) alive.
    // Vitest only collects files matching the config's include globs, which
    // are relative to its root. Repo tests run from ROOT_DIR with the project
    // config; fixture tests outside the repo (the mutation end-to-end test)
    // run from their own directory, where vitest falls back to defaults that
    // match any *.test.js.
    const inRoot = testFiles.every((file) =>
      resolvePath(file).startsWith(`${ROOT_DIR}/`),
    );
    const cwd = inRoot ? ROOT_DIR : dirname(resolvePath(testFiles[0]));
    const vitestBin = join(ROOT_DIR, "node_modules/vitest/vitest.mjs");
    const child = spawn(process.execPath, [vitestBin, "run", ...testFiles], {
      cwd,
      env: process.env,
      killSignal: "SIGKILL",
      signal: controller.signal,
      stdio: "ignore",
    });

    const cleanup = () => {
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onAbort);
    };
    // On abort the kill emits `error` (AbortError) *before* the process has
    // exited. Resolving here would let the caller restore the source and start
    // the next mutant while this one is still shutting down, overlapping two
    // runs on the same file — so the timeout path waits for `close`.
    //
    // A non-abort `error` is a genuine spawn failure (e.g. EMFILE/EAGAIN, or
    // vitest missing): the tests never ran, so this is NOT a detected mutant.
    // Reject so the whole run fails loudly rather than scoring a false pass.
    child.on("error", (err) => {
      if (timedOut) return;
      cleanup();
      reject(err);
    });
    child.on("close", (code) => {
      cleanup();
      resolve({
        durationMs: performance.now() - startedAt,
        outcome: timedOut ? "timed-out" : code === 0 ? "passed" : "failed",
      });
    });
  });

/** @param {"passed" | "failed" | "timed-out"} outcome */
const toStatus = (outcome) =>
  outcome === "passed"
    ? "survived"
    : outcome === "failed"
      ? "killed"
      : "timed-out";

/** @param {string} status */
const statusGlyph = (status) =>
  status === "killed"
    ? green(".")
    : status === "timed-out"
      ? yellow("T")
      : status === "ignored"
        ? dim("i")
        : red("S");

/**
 * Mutate the file, run the tests, and always restore the original.
 * @param {string} file
 * @param {string} original
 * @param {Mutant} mutant
 * @param {string[]} testFiles
 * @param {number} timeoutMs
 * @param {AbortSignal} abortSignal
 */
const evaluateMutant = async (
  file,
  original,
  mutant,
  testFiles,
  timeoutMs,
  abortSignal,
) => {
  writeFileSync(file, applyMutant(original, mutant));
  try {
    const { outcome } = await runTests(testFiles, timeoutMs, abortSignal);
    return toStatus(outcome);
  } finally {
    writeFileSync(file, original);
  }
};

/**
 * Print the report (and the CI step summary), returning the exit code:
 * 0 = every mutant detected (or all survivors are known-equivalent), 1 =
 * survivors, 2 = inconclusive (no mutants at all, so the run proved nothing —
 * fail rather than report a vacuous 100%). A file whose every mutant is
 * suppressed is *not* inconclusive: that is what the ignore-list is for, so it
 * passes.
 * @param {MutantResult[]} results
 */
const report = (results) => {
  const summary = summarize(results);
  for (const line of formatSummaryLines(summary)) console.log(line);
  writeStepSummary(summary);
  if (summary.total === 0) return 2;
  return summary.survived === 0 ? 0 : 1;
};

/**
 * Run the baseline tests, returning the per-mutant timeout, or null on failure.
 * @param {string[]} testFiles
 * @param {number} timeout
 * @param {AbortSignal} abortSignal
 */
const baselineTimeout = async (testFiles, timeout, abortSignal) => {
  console.log(dim("Running baseline (unmutated) tests…"));
  const baseline = await runTests(testFiles, BASELINE_TIMEOUT, abortSignal);
  if (baseline.outcome !== "passed") {
    console.error(red(`\nBaseline tests did not pass (${baseline.outcome}).`));
    console.error(
      "Mutation testing needs a green baseline — fix the tests first.",
    );
    return null;
  }
  const perMutant = Math.max(
    timeout,
    Math.ceil(baseline.durationMs * TIMEOUT_MULTIPLIER),
  );
  console.log(
    dim(
      `Baseline passed in ${Math.round(baseline.durationMs)}ms; per-mutant timeout ${perMutant}ms.\n`,
    ),
  );
  return perMutant;
};

/**
 * @param {string} file
 * @param {number} count
 */
const logMutantCount = (file, count) =>
  count === 0
    ? console.log(yellow(`  no mutable operators in ${rel(file)}`))
    : console.log(dim(`  ${rel(file)}: ${count} mutants`));

/**
 * Final status for a mutant: a known-equivalent survivor is suppressed.
 * @param {"survived" | "killed" | "timed-out"} outcome
 * @param {IgnoreList} ignoreList
 * @param {string} file
 * @param {Mutant} mutant
 */
const classify = (outcome, ignoreList, file, mutant) =>
  outcome === "survived" && isIgnored(ignoreList, file, mutant)
    ? "ignored"
    : outcome;

/**
 * Mutate one source file, appending each mutant's result to `results`.
 * @param {string} file
 * @param {MutationRunContext} ctx
 */
const mutateFile = async (file, ctx) => {
  const {
    abortSignal,
    exhaustive,
    ignoreList,
    isAborted,
    originals,
    results,
    testFiles,
    timeout,
  } = ctx;
  const original = readFileSync(file, "utf-8");
  originals.set(file, original);
  const mutants = generateMutants(original, file, exhaustive);
  logMutantCount(file, mutants.length);
  for (const mutant of mutants) {
    if (isAborted()) break;
    const outcome = await evaluateMutant(
      file,
      original,
      mutant,
      testFiles,
      timeout,
      abortSignal,
    );
    if (isAborted()) break;
    const status = classify(outcome, ignoreList, file, mutant);
    results.push({ file, mutant, status });
    write(statusGlyph(status));
  }
  originals.delete(file);
};

/**
 * Mutate every source file in turn, always restoring the originals.
 * @param {MutationRunContext} ctx
 */
const mutateAllFiles = async (ctx) => {
  const { isAborted, restoreAll, sourceFiles } = ctx;
  try {
    for (const file of sourceFiles) {
      if (isAborted()) break;
      await mutateFile(file, ctx);
    }
  } finally {
    restoreAll();
  }
};

/**
 * Print any ignore-list problems. The list is location-based, so it drifts as
 * code moves: an entry that no longer lines up with a real survivor is a
 * problem to fix, not silent rot.
 * @param {string[]} problems
 */
const reportIgnoreProblems = (problems) => {
  if (problems.length === 0) return;
  console.error(
    yellow("\nIgnore-list issues (scripts/mutation/equivalent-mutants.txt):"),
  );
  for (const problem of problems) console.error(red(`  ✗ ${problem}`));
  console.error(
    dim("  Update or remove these so the list stays in sync with reality."),
  );
};

/**
 * Baseline check, then the per-file/per-mutant loop, then the report.
 * @param {MutationRunContext} opts
 */
const runMutants = async (opts) => {
  const {
    abortSignal,
    ignoreList,
    isAborted,
    results,
    sourceFiles,
    testFiles,
    timeout,
  } = opts;

  const perMutantTimeout = await baselineTimeout(
    testFiles,
    timeout,
    abortSignal,
  );
  if (isAborted()) return 130;
  if (perMutantTimeout === null) return 1;

  await mutateAllFiles({ ...opts, timeout: perMutantTimeout });
  write("\n");

  if (isAborted()) {
    console.log(yellow("Interrupted — restored sources."));
    return 130;
  }

  return finishRun(results, ignoreList, sourceFiles);
};

/**
 * Print the report, fold ignore-list problems into the exit code.
 * @param {MutantResult[]} results
 * @param {IgnoreList} ignoreList
 * @param {string[]} sourceFiles
 * @returns {number}
 */
const finishRun = (results, ignoreList, sourceFiles) => {
  const exitCode = report(results);
  const problems = ignoreListProblems(ignoreList, results, sourceFiles);
  reportIgnoreProblems(problems);
  if (problems.length > 0 && exitCode === 0) return 1;
  return exitCode;
};

/**
 * Never silent: a source file left mutated on disk is the worst outcome
 * this tool has, so a failed restore is reported and fails the run while
 * restoreAll keeps restoring the other files.
 * @param {string} file
 * @param {unknown} err
 */
const reportRestoreFailure = (file, err) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(red(`FAILED to restore ${rel(file)}: ${reason}`));
  console.error(red("Restore it from git before trusting the tree."));
  process.exitCode = 1;
};

/**
 * Entry point: run mutation testing, returning a process exit code.
 *
 * On SIGINT/SIGTERM, abort the in-flight test run and let the loop fall through
 * so every `finally` runs and the source files are restored. A second signal
 * force-quits in case unwinding ever stalls.
 * @param {{ exhaustive: boolean, sourceFiles: string[], testFiles: string[], timeout: number }} options
 */
export const runMutationTesting = async (options) => {
  const { exhaustive, sourceFiles, testFiles, timeout } = options;
  const ignoreList = loadIgnoreList();

  const results = newResults();
  const originals = new Map();
  const restoreAll = () => {
    for (const [file, content] of originals) {
      try {
        writeFileSync(file, content);
      } catch (err) {
        reportRestoreFailure(file, err);
      }
    }
  };

  const abortController = new AbortController();
  let aborted = false;
  const onSignal = () => {
    if (aborted) {
      restoreAll();
      process.exit(130);
    }
    aborted = true;
    abortController.abort();
  };
  const signals = ["SIGINT", "SIGTERM"];
  for (const signal of signals) process.on(signal, onSignal);

  try {
    return await runMutants({
      abortSignal: abortController.signal,
      exhaustive,
      ignoreList,
      isAborted: () => aborted,
      originals,
      restoreAll,
      results,
      sourceFiles,
      testFiles,
      timeout,
    });
  } catch (err) {
    // A spawn failure (e.g. EMFILE/EAGAIN) means a mutant's tests never ran, so
    // its result is unknown — fail the whole run loudly instead of scoring a
    // false pass. Sources are already restored by mutateAllFiles's finally.
    restoreAll();
    const reason = err instanceof Error ? err.message : String(err);
    console.error(red(`\nMutation run aborted: ${reason}`));
    console.error(
      dim("A test process failed to spawn, so results are incomplete."),
    );
    return 1;
  } finally {
    for (const signal of signals) process.removeListener(signal, onSignal);
  }
};
