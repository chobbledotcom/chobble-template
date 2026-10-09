#!/usr/bin/env node
/**
 * Fail-fast Eleventy build wrapper.
 *
 * By default, Eleventy continues processing other templates after an error,
 * and async image processing continues in the background. This makes it hard
 * to identify errors in CI logs (they get buried under thousands of lines).
 *
 * This wrapper monitors the build output and immediately terminates on error,
 * ensuring errors are visible at the end of the log output. Every CLI arg is
 * forwarded to Eleventy verbatim; the wrapper only inspects them.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import {
  calculateAverageCpuUsage,
  formatAverageCpuUsage,
  getCpuSnapshot,
} from "#scripts/build-metrics.js";
import { runTool } from "#scripts/lib/run-tool.js";
import { validateSiteData } from "#scripts/site-data.js";

const ERROR_PATTERNS = [
  "[11ty] Problem writing Eleventy templates:",
  "[11ty] Eleventy Fatal Error",
  "TemplateContentRenderError",
  "EleventyShortcodeError",
];

const args = process.argv.slice(2);
// Recognise both the long flag and the short alias the wrapper's old
// parser accepted, so `-s` still triggers the serve-mode Pagefind run.
const isServeMode = args.includes("--serve") || args.includes("-s");

const cpuStart = getCpuSnapshot();

validateSiteData();

const eleventy = spawn(
  process.execPath,
  [join(ROOT_DIR, "node_modules/@awesome.me/buildawesome/cmd.js"), ...args],
  {
    cwd: ROOT_DIR,
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  },
);

const buildState = { errorDetected: false, pagefindRanForServe: false };

/** @param {string} text */
const containsError = (text) =>
  ERROR_PATTERNS.some((pattern) => text.includes(pattern));

/** @param {string} text */
const isImageProcessingNoise = (text) => text.includes("[11ty/eleventy-img]");

const BANNER_LINE = "=".repeat(60);

const printFailureBanner = () => {
  console.error("\n");
  console.error(BANNER_LINE);
  console.error("BUILD FAILED - Terminating immediately");
  console.error(BANNER_LINE);
  console.error("\nThe error above caused the build to fail.");
  console.error("Fix the issue and rebuild.\n");
};

const triggerFailFast = () => {
  buildState.errorDetected = true;
  setTimeout(() => {
    printFailureBanner();
    eleventy.kill("SIGTERM");
  }, 100);
};

/**
 * @param {Buffer} data
 * @param {string} text
 */
const writeErrorOutput = (data, text) => {
  if (!isImageProcessingNoise(text)) {
    process.stderr.write(data);
  }
};

/**
 * @param {Buffer} data
 * @param {boolean} isStderr
 */
const writeNormalOutput = (data, isStderr) => {
  const target = isStderr ? process.stderr : process.stdout;
  target.write(data);
};

const runPagefind = () => {
  console.log("\nRunning Pagefind indexer...");
  const status = runTool("npx", ["pagefind", "--site", "_site"]);
  if (status !== 0) {
    console.error("Pagefind indexing failed");
    return false;
  }
  console.log("Pagefind indexing complete\n");
  return true;
};

/**
 * @param {Buffer} data
 * @param {boolean} isStderr
 */
const processChunk = (data, isStderr) => {
  const text = data.toString();
  if (buildState.errorDetected) {
    writeErrorOutput(data, text);
    return;
  }
  writeNormalOutput(data, isStderr);
  if (containsError(text)) {
    triggerFailFast();
  }
  if (
    isServeMode &&
    !buildState.pagefindRanForServe &&
    text.includes("[11ty] Watching")
  ) {
    buildState.pagefindRanForServe = true;
    runPagefind();
  }
};

/**
 * @param {import("node:stream").Readable} stream
 * @param {boolean} isStderr
 */
const handleOutput = (stream, isStderr) => {
  stream.on("data", (data) => processChunk(data, isStderr));
};

handleOutput(eleventy.stdout, false);
handleOutput(eleventy.stderr, true);

eleventy.on("close", (code) => {
  if (buildState.errorDetected || code !== 0) {
    process.exit(code || 1);
  }
  if (!isServeMode) {
    if (!runPagefind()) {
      process.exit(1);
    }
    const cpuUsage = calculateAverageCpuUsage(cpuStart, getCpuSnapshot());
    console.log(formatAverageCpuUsage(cpuUsage));
  }
  process.exit(0);
});

eleventy.on("error", (err) => {
  console.error("Failed to start Eleventy:", err.message);
  process.exit(1);
});
