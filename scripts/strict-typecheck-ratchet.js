#!/usr/bin/env node
/**
 * Strict typecheck ratchet - prevents strict type error regressions
 *
 * Runs tsc --strict across the project and ensures:
 * 1. Total error count does not exceed the current baseline
 * 2. Files that are currently strict-clean do not gain errors
 *
 * When you fix strict errors, lower CURRENT_ERROR_COUNT and add
 * any newly-clean files to STRICT_CLEAN_FILES.
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";

// Current baseline - lower this as you fix errors
const CURRENT_ERROR_COUNT = 631;

// Files that currently pass strict mode (must not regress)
const STRICT_CLEAN_FILES = [
  "packages/js-toolkit/code-quality/index.js",
  "packages/js-toolkit/code-quality/runner.js",
  "packages/js-toolkit/code-quality/scanner.js",
  "packages/js-toolkit/fp/grouping.js",
  "packages/js-toolkit/fp/index.js",
  "packages/js-toolkit/fp/object.js",
  "packages/js-toolkit/fp/sorting.js",
  "packages/js-toolkit/test-utils/assertions.js",
  "packages/js-toolkit/test-utils/code-analysis.js",
  "packages/js-toolkit/test-utils/index.js",
  "packages/js-toolkit/test-utils/mocking.js",
  "packages/js-toolkit/test-utils/resource.js",
  "src/_data/body-classes.js",
  "src/_data/config.js",
  "src/_data/contact-form.js",
  "src/_data/dietaryIndicators.js",
  "src/_data/pageLayouts.js",
  "src/_data/production.js",
  "src/_data/quote-fields.js",
  "src/_data/selectors.js",
  "src/_data/site.js",
  "src/_data/strings.js",
  "src/_lib/build/build-mode.js",
  "src/_lib/collections/tags.js",
  "src/_lib/config/site-config.js",
  "src/_lib/eleventy/add-data-filter.js",
  "src/_lib/filters/spec-filters.js",
  "src/_lib/paths.js",
  "src/_lib/transforms/linkify.js",
  "src/_lib/transforms/responsive-tables.js",
  "src/_lib/utils/canonical-url.js",
  "src/_lib/utils/dietary-utils.js",
  "src/_lib/utils/dom-builder.js",
  "src/_lib/utils/lazy-dom.js",
  "src/_lib/utils/math-utils.js",
  "src/_lib/utils/mock-filter-attributes.js",
  "src/_lib/utils/slug-utils.js",
  "src/_lib/utils/video.js",
];

const result = spawnSync(
  "bun",
  ["run", "tsc", "--noEmit", "-p", "tsconfig.strict.json"],
  {
    cwd: ROOT_DIR,
    stdio: ["inherit", "pipe", "pipe"],
  },
);

const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`;
const errorLines = output
  .split("\n")
  .filter((line) => line.includes("error TS"));
const errorCount = errorLines.length;

// Extract files with errors
const filesWithErrors = new Set(
  errorLines.map((line) => line.replace(/\(.*/, "").trim()),
);

// Check for regressions in clean files
const regressions = STRICT_CLEAN_FILES.filter((file) =>
  filesWithErrors.has(file),
);

let failed = false;

// Check total error count
if (errorCount > CURRENT_ERROR_COUNT) {
  console.error(
    `\n❌ Strict typecheck ratchet failed: ${errorCount} errors (limit: ${CURRENT_ERROR_COUNT})`,
  );
  console.error("   Fix the new errors or do not introduce untyped code.");
  failed = true;
} else if (errorCount < CURRENT_ERROR_COUNT) {
  console.log(
    `\n🎉 Strict errors decreased: ${errorCount} (was ${CURRENT_ERROR_COUNT})`,
  );
  console.log(
    `   Update CURRENT_ERROR_COUNT to ${errorCount} in scripts/strict-typecheck-ratchet.js`,
  );
}

// Check clean file regressions
if (regressions.length > 0) {
  console.error("\n❌ These strict-clean files gained errors:");
  for (const file of regressions) {
    console.error(`   ${file}`);
  }
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log(
    `\n✅ Strict typecheck ratchet passed: ${errorCount} errors (limit: ${CURRENT_ERROR_COUNT}), ${STRICT_CLEAN_FILES.length} clean files protected`,
  );
}
