#!/usr/bin/env bun
/**
 * Fail-fast Eleventy build wrapper.
 *
 * By default, Eleventy continues processing other templates after an error,
 * and async image processing continues in the background. This makes it hard
 * to identify errors in CI logs (they get buried under thousands of lines).
 *
 * This wrapper monitors the build output and immediately terminates on error,
 * ensuring errors are visible at the end of the log output.
 */
import { spawn, spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

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

const eleventy = spawn(
  "bun",
  ["./node_modules/@11ty/eleventy/cmd.cjs", ...args],
  {
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  },
);

let errorDetected = false;

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

const triggerFailFast = () => {
  errorDetected = true;
  setTimeout(() => {
    printFailureBanner();
    eleventy.kill("SIGTERM");
  }, 100);
};

const writeErrorOutput = (data, text) => {
  if (!isImageProcessingNoise(text)) {
    process.stderr.write(data);
  }
};

const writeNormalOutput = (data, isStderr) => {
  const target = isStderr ? process.stderr : process.stdout;
  target.write(data);
};

const runPagefind = () => {
  console.log("\nRunning Pagefind indexer...");
  const result = spawnSync(
    "bun",
    [
      "./node_modules/.bin/pagefind",
      "--site",
      "_site",
      "--exclude-selectors",
      "body.filtered-properties [data-pagefind-body], body.base [data-pagefind-body]",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    console.error("Pagefind indexing failed");
    return false;
  }
  console.log("Pagefind indexing complete\n");
  return true;
};

let pagefindRanForServe = false;

const processChunk = (data, isStderr) => {
  const text = data.toString();
  if (errorDetected) {
    writeErrorOutput(data, text);
    return;
  }
  writeNormalOutput(data, isStderr);
  if (containsError(text)) {
    triggerFailFast();
  }
  if (
    values.serve &&
    !pagefindRanForServe &&
    text.includes("[11ty] Watching")
  ) {
    pagefindRanForServe = true;
    runPagefind();
  }
};

const handleOutput = (stream, isStderr) => {
  stream.on("data", (data) => processChunk(data, isStderr));
};

handleOutput(eleventy.stdout, false);
handleOutput(eleventy.stderr, true);

eleventy.on("close", (code) => {
  if (errorDetected || code !== 0) {
    process.exit(code || 1);
  }
  if (!values.serve) {
    if (!runPagefind()) {
      process.exit(1);
    }
  }
  process.exit(0);
});

eleventy.on("error", (err) => {
  console.error("Failed to start Eleventy:", err.message);
  process.exit(1);
});
