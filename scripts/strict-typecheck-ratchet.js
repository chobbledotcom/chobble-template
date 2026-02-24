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
const CURRENT_ERROR_COUNT = 474;

// Files that currently pass strict mode (must not regress)
const STRICT_CLEAN_FILES = [
  "packages/js-toolkit/code-quality/index.js",
  "packages/js-toolkit/code-quality/runner.js",
  "packages/js-toolkit/code-quality/scanner.js",
  "packages/js-toolkit/fp/grouping.js",
  "packages/js-toolkit/fp/index.js",
  "packages/js-toolkit/fp/memoize.js",
  "packages/js-toolkit/fp/object.js",
  "packages/js-toolkit/fp/set.js",
  "packages/js-toolkit/fp/sorting.js",
  "packages/js-toolkit/test-utils/assertions.js",
  "packages/js-toolkit/test-utils/code-analysis.js",
  "packages/js-toolkit/test-utils/index.js",
  "packages/js-toolkit/test-utils/mocking.js",
  "packages/js-toolkit/test-utils/resource.js",
  "src/_data/altTagsLookup.js",
  "src/_data/body-classes.js",
  "src/_data/categoryOrder.js",
  "src/_data/config.js",
  "src/_data/contact-form.js",
  "src/_data/dietaryIndicators.js",
  "src/_data/eleventyComputed.js",
  "src/_data/listItemFields.js",
  "src/_data/metaComputed.js",
  "src/_data/pageLayouts.js",
  "src/_data/production.js",
  "src/_data/propertyOrder.js",
  "src/_data/quote-fields.js",
  "src/_data/selectors.js",
  "src/_data/site.js",
  "src/_data/strings.js",
  "src/_lib/build/build-mode.js",
  "src/_lib/build/js-bundler.js",
  "src/_lib/build/theme-compiler.js",
  "src/_lib/collections/guides.js",
  "src/_lib/collections/tags.js",
  "src/_lib/config/helpers.js",
  "src/_lib/config/site-config.js",
  "src/_lib/eleventy/add-data-filter.js",
  "src/_lib/eleventy/cache-buster.js",
  "src/_lib/eleventy/canonical-url.js",
  "src/_lib/eleventy/format-price.js",
  "src/_lib/eleventy/js-config.js",
  "src/_lib/eleventy/layout-aliases.js",
  "src/_lib/eleventy/opening-times.js",
  "src/_lib/eleventy/recurring-events.js",
  "src/_lib/eleventy/video.js",
  "src/_lib/filters/spec-filters.js",
  "src/_lib/media/image-frontmatter.js",
  "src/_lib/media/image-placeholder.js",
  "src/_lib/media/inline-asset.js",
  "src/_lib/paths.js",
  "src/_lib/transforms/images.js",
  "src/_lib/transforms/linkify.js",
  "src/_lib/transforms/responsive-tables.js",
  "src/_lib/utils/canonical-url.js",
  "src/_lib/utils/console.js",
  "src/_lib/utils/dietary-utils.js",
  "src/_lib/utils/dom-builder.js",
  "src/_lib/utils/format-price.js",
  "src/_lib/utils/lazy-dom.js",
  "src/_lib/utils/linkable-content.js",
  "src/_lib/utils/liquid-render.js",
  "src/_lib/utils/math-utils.js",
  "src/_lib/utils/mock-filter-attributes.js",
  "src/_lib/utils/navigation-utils.js",
  "src/_lib/utils/slug-utils.js",
  "src/_lib/utils/video.js",
  "src/categories/categories.11tydata.js",
  "src/events/events.11tydata.js",
  "src/guide-categories/guide-categories.11tydata.js",
  "src/guide-pages/guide-pages.11tydata.js",
  "src/locations/locations.11tydata.js",
  "src/menu-categories/menu-categories.11tydata.js",
  "src/menu-items/menu-items.11tydata.js",
  "src/menus/menus.11tydata.js",
  "src/news/news.11tydata.js",
  "src/pages/pages.11tydata.js",
  "src/products/products.11tydata.js",
  "src/properties/properties.11tydata.js",
  "src/reviews/reviews.11tydata.js",
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
const fullOutput = output.split("\n");
const errorLines = fullOutput.filter((line) => line.includes("error TS"));
const errorCount = errorLines.length;

// Parse errors by file with full details
const errorsByFile = new Map();
for (const line of errorLines) {
  const fileMatch = line.match(/^([^:]+):/);
  if (fileMatch) {
    const file = fileMatch[1];
    if (!errorsByFile.has(file)) {
      errorsByFile.set(file, []);
    }
    errorsByFile.get(file).push(line);
  }
}

// Extract files with errors
const filesWithErrors = new Set(errorsByFile.keys());

// Check for regressions in clean files
const regressions = STRICT_CLEAN_FILES.filter((file) =>
  filesWithErrors.has(file),
);

let failed = false;

// Check total error count
if (errorCount > CURRENT_ERROR_COUNT) {
  const newErrorCount = errorCount - CURRENT_ERROR_COUNT;
  console.error(
    `\n❌ Strict typecheck ratchet failed: ${errorCount} errors (limit: ${CURRENT_ERROR_COUNT})`,
  );
  console.error(`   You've introduced ${newErrorCount} new untyped error(s).`);
  console.error("");
  console.error("   📝 What to do:");
  console.error(
    "   1. Review the errors below and add proper TypeScript types",
  );
  console.error("   2. Consider using 'unknown' instead of implicit 'any'");
  console.error("   3. Add JSDoc type annotations if needed");
  console.error("   4. Update CURRENT_ERROR_COUNT when done fixing errors");
  console.error("");
  console.error(
    "   🔍 All errors in non-strict files (review to find what changed):",
  );
  for (const [file, errors] of errorsByFile) {
    if (!STRICT_CLEAN_FILES.includes(file)) {
      console.error(`\n      ${file}`);
      for (const error of errors) {
        console.error(`      ${error}`);
      }
    }
  }
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
  console.error("\n❌ These strict-clean files gained errors (regressions):");
  for (const file of regressions) {
    console.error(`\n   ${file}`);
    const errors = errorsByFile.get(file) || [];
    for (const error of errors) {
      console.error(`   ${error}`);
    }
  }
  console.error("");
  console.error(
    "   ⚠️  Fix these regressions immediately - they were previously strict-clean.",
  );
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log(
    `\n✅ Strict typecheck ratchet passed: ${errorCount} errors (limit: ${CURRENT_ERROR_COUNT}), ${STRICT_CLEAN_FILES.length} clean files protected`,
  );
}
