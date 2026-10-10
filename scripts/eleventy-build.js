#!/usr/bin/env bun
/**
 * Fail-fast Eleventy build wrapper.
 *
 * By default, Eleventy continues processing other templates after an error,
 * and async image processing continues in the background. This wrapper
 * terminates the build when one of Eleventy's fatal error markers appears.
 */
import { parseArgs } from "node:util";
import {
  combinePhaseMetrics,
  createPhaseMetrics,
  formatPhaseMetrics,
} from "#scripts/build-metrics.js";

const ERROR_PATTERNS = [
  "[11ty] Problem writing Eleventy templates:",
  "[11ty] Eleventy Fatal Error",
  "TemplateContentRenderError",
  "EleventyShortcodeError",
];

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    serve: { type: "boolean", short: "s" },
    incremental: { type: "boolean", short: "i" },
  },
  allowPositionals: true,
  strict: false,
});

const args = [];
if (values.serve) args.push("--serve");
if (values.incremental) args.push("--incremental");
args.push(...positionals);

const containsError = (text) =>
  ERROR_PATTERNS.some((pattern) => text.includes(pattern));

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

const reportProcessFailure = (message, error) => {
  console.error(message, error.message);
  process.exitCode = 1;
  return null;
};

const runPagefind = () => {
  console.log("\nRunning Pagefind indexer...");
  const startedAt = performance.now();
  const result = Bun.spawnSync(
    [process.execPath, "./node_modules/.bin/pagefind", "--site", "_site"],
    {
      env: process.env,
      stderr: "inherit",
      stdin: "inherit",
      stdout: "inherit",
    },
  );
  const metrics = createPhaseMetrics({
    name: "Pagefind",
    resourceUsage: result.resourceUsage,
    wallMs: performance.now() - startedAt,
  });

  console.log(formatPhaseMetrics(metrics));
  if (result.exitCode !== 0) {
    console.error("Pagefind indexing failed");
    return { metrics, succeeded: false };
  }
  console.log("Pagefind indexing complete\n");
  return { metrics, succeeded: true };
};

const spawnEleventy = () => {
  try {
    return Bun.spawn(
      [process.execPath, "./node_modules/@11ty/eleventy/cmd.cjs", ...args],
      {
        env: process.env,
        stderr: "pipe",
        stdin: "inherit",
        stdout: "pipe",
      },
    );
  } catch (error) {
    return reportProcessFailure("Failed to start Eleventy:", error);
  }
};

const pumpOutput = async (stream, processChunk, isStderr) => {
  const reader = stream.getReader();
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      processChunk(Buffer.from(chunk.value), isStderr);
      chunk = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
};

const waitForEleventy = async (eleventy, output) => {
  try {
    const exitCode = await eleventy.exited;
    await output;
    return exitCode;
  } catch (error) {
    return reportProcessFailure("Eleventy process failed:", error);
  }
};

const createOutputProcessor = (eleventy) => {
  let errorDetected = false;
  let pagefindRanForServe = false;

  const triggerFailFast = () => {
    errorDetected = true;
    setTimeout(() => {
      printFailureBanner();
      eleventy.kill("SIGTERM");
    }, 100);
  };

  const shouldRunPagefind = (text) =>
    values.serve && !pagefindRanForServe && text.includes("[11ty] Watching");

  const writeAfterError = (data, text) => {
    if (!isImageProcessingNoise(text)) process.stderr.write(data);
  };

  const processNormalChunk = (data, text, isStderr) => {
    const target = isStderr ? process.stderr : process.stdout;
    target.write(data);
    if (containsError(text)) triggerFailFast();
    if (shouldRunPagefind(text)) {
      pagefindRanForServe = true;
      runPagefind();
    }
  };

  const processChunk = (data, isStderr) => {
    const text = data.toString();
    if (errorDetected) {
      writeAfterError(data, text);
      return;
    }
    processNormalChunk(data, text, isStderr);
  };

  return {
    failed: () => errorDetected,
    processChunk,
  };
};

const getEleventyMetrics = (eleventy, startedAt) => {
  const usage = eleventy.resourceUsage();
  return usage
    ? createPhaseMetrics({
        name: "Eleventy",
        resourceUsage: usage,
        wallMs: performance.now() - startedAt,
      })
    : null;
};

const runPostBuild = (eleventyMetrics) => {
  const pagefind = runPagefind();
  if (!pagefind.succeeded) {
    process.exitCode = 1;
    return;
  }
  if (eleventyMetrics) {
    console.log(
      formatPhaseMetrics(
        combinePhaseMetrics("Total build", [eleventyMetrics, pagefind.metrics]),
      ),
    );
  }
};

const main = async () => {
  const startedAt = performance.now();
  const eleventy = spawnEleventy();
  if (!eleventy) return;
  const outputProcessor = createOutputProcessor(eleventy);

  const output = Promise.all([
    pumpOutput(eleventy.stdout, outputProcessor.processChunk, false),
    pumpOutput(eleventy.stderr, outputProcessor.processChunk, true),
  ]);
  const exitCode = await waitForEleventy(eleventy, output);
  if (exitCode === null) return;

  const eleventyMetrics = getEleventyMetrics(eleventy, startedAt);
  if (eleventyMetrics) console.log(formatPhaseMetrics(eleventyMetrics));

  if (outputProcessor.failed() || exitCode !== 0) {
    process.exitCode = exitCode || 1;
    return;
  }
  if (values.serve) return;
  runPostBuild(eleventyMetrics);
};

await main();
