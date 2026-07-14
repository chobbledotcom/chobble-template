/**
 * Streaming precommit runner - shows one pass/fail line per step with live
 * progress where available, stays quiet on success, and prints extracted
 * errors only for failing steps. Ported from tickets' precommit/runner.ts.
 *
 * - Merits a pre-commit conflict probe (git merge-tree) and, after a successful
 *   manual run with a clean tree, an offer to `git push`.
 * - `--verbose` prints full captured output for every step; default prints only
 *   failures. `--ci` (or CI env) disables progress spinners and prompts.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import {
  bold,
  dim,
  green,
  red,
  write,
  yellow,
} from "#test/precommit/colors.js";
import { getMergeConflictWarning } from "#test/precommit/merge-warning.js";
import { promptToPushCheckedInChanges } from "#test/precommit/push.js";
import { getSteps } from "#test/precommit/steps.js";
import {
  canPrompt,
  canShowProgress,
  currentTerminalState,
} from "#test/precommit/terminal.js";
import {
  extractErrorsFromOutput,
  printTruncatedList,
  reportCoverageFailures,
} from "#test/test-runner-utils.js";

const GIT_LOCAL_ENV_VARS = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_GRAFT_FILE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_WORK_TREE",
];

const isVerbose = () => process.argv.includes("--verbose");

export const getStepEnvironment = (environment, verbose) => ({
  ...Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => !GIT_LOCAL_ENV_VARS.includes(name),
    ),
  ),
  VERBOSE: verbose ? "1" : "0",
});

const finishStep = ({ step, stdout, stderr, status, elapsed }) => {
  const mark = status === 0 ? green("✓") : red("✗");
  write(`${mark} ${dim(`${elapsed}s`)}\n`);
  if (step.postRun) step.postRun(`${stdout}\n${stderr}`, status);
};

/** Drain a child stdout/stderr stream, calling onChunk per raw decoded chunk
 * and onLine per complete newline-terminated line. Resolves to full text. */
const readStream = (stream, { onChunk, onLine }) =>
  new Promise((resolve) => {
    const decoder = new TextDecoder();
    const buf = { text: "", pending: "" };

    const onData = (data) => {
      const str = decoder.decode(data, { stream: true });
      buf.text += str;
      if (onChunk) onChunk(str);
      buf.pending += str;
      const lines = buf.pending.split(/\r?\n/);
      buf.pending = lines.pop() ?? "";
      for (const line of lines) if (onLine) onLine(line);
    };
    const onEnd = () => {
      const tail = decoder.decode();
      buf.text += tail;
      buf.pending += tail;
      if (buf.pending && onLine) onLine(buf.pending);
      resolve(buf.text);
    };

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", () => onEnd());
  });

const runStep = async (step, showProgress) => {
  const prefix = `  ${step.name} … `;
  write(prefix);
  const start = performance.now();
  const [command, ...args] = step.cmd;
  if (!command) throw new Error(`No command configured for ${step.name}`);

  if (step.preRun) step.preRun();

  const child = spawn(command, args, {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: getStepEnvironment(process.env, isVerbose()),
  });

  const progress = { value: "" };
  const updateProgress = (next) => {
    if (!showProgress || !next || next === progress.value) return;
    progress.value = next;
    write(`\r\x1b[2K${prefix}${next} `);
  };
  const onChunk = (str) => {
    if (step.progress) updateProgress(step.progress(str));
  };

  const closePromise = new Promise((resolve) => child.on("close", resolve));
  const [stdout, stderr, status] = await Promise.all([
    readStream(child.stdout, { onChunk }),
    readStream(child.stderr, { onChunk }),
    closePromise,
  ]);
  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  if (progress.value) write(`\r\x1b[2K${prefix}`);
  const result = { step, stdout, stderr, status, elapsed };

  if (status === 0) {
    finishStep(result);
    if (isVerbose() && (stdout || stderr)) {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    }
    return true;
  }

  finishStep(result);

  const errors = [
    ...extractErrorsFromOutput(stdout),
    ...extractErrorsFromOutput(stderr),
  ];
  console.log(`\n${step.name} errors:`);
  if (errors.length > 0) {
    printTruncatedList({ moreLabel: "errors" })(errors);
  } else {
    const lcovPath = join(ROOT_DIR, "coverage/lcov.info");
    const bunfigPath = join(ROOT_DIR, "bunfig.toml");
    if (reportCoverageFailures(lcovPath, bunfigPath)) {
      console.log(
        "  Thresholds are defined in bunfig.toml (coverageThreshold).",
      );
    } else {
      const allOutput = stderr || stdout || "";
      console.log("  No specific errors extracted. Last 15 lines of output:");
      const lastLines = allOutput
        .split("\n")
        .slice(-15)
        .filter((l) => l.trim());
      for (const line of lastLines) console.log(`  ${line}`);
    }
  }
  return false;
};

export const main = async () => {
  const ci = process.argv.includes("--ci") || Boolean(process.env.CI);
  if (ci && !process.env.CI) process.env.CI = "1";
  console.log(bold(ci ? "precommit (ci)" : "precommit"));

  const warning = getMergeConflictWarning();
  if (warning) console.warn(yellow(warning));

  const terminalState = currentTerminalState();
  const showProgress = canShowProgress(terminalState);
  const steps = getSteps();
  for (const step of steps) {
    const passed = await runStep(step, showProgress);
    if (!passed) {
      console.log(`\n${red("precommit failed")} at ${step.name}`);
      process.exit(1);
    }
  }

  console.log(`\n${green("precommit passed")}`);
  const pushed = await promptToPushCheckedInChanges({
    isInteractive: () => canPrompt(currentTerminalState()),
  });
  if (!pushed) {
    console.log(red("git push failed"));
    process.exit(1);
  }
};
