/**
 * Centralized code quality exceptions
 *
 * All whitelisted/grandfathered code quality violations are defined here.
 * These should be removed over time as the codebase is refactored.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                              ⚠️  WARNING ⚠️                                ║
 * ║                                                                           ║
 * ║  DO NOT ADD NEW ENTRIES TO THIS FILE UNDER ANY CIRCUMSTANCES.             ║
 * ║                                                                           ║
 * ║  This file exists ONLY to track legacy code that predates our quality     ║
 * ║  standards. Every entry here represents technical debt that must be       ║
 * ║  eliminated, not expanded.                                                ║
 * ║                                                                           ║
 * ║  The ONLY valid changes to this file are DELETIONS.                       ║
 * ║                                                                           ║
 * ║  If your new code triggers a quality check failure:                       ║
 * ║    1. Fix the code to meet quality standards - no exceptions              ║
 * ║    2. If you believe the check is wrong, fix the check itself             ║
 * ║    3. There is no option 3 - adding exceptions is not allowed             ║
 * ║                                                                           ║
 * ║  PRs that add new entries to this file will be rejected.                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { frozenSet } from "#utils/fp/set.js";

// ============================================
// try/catch exceptions
// ============================================

// Add file:line for specific locations, or just file path to allow all try/catch in that file
const ALLOWED_TRY_CATCHES = frozenSet([
  // test/ensure-deps.js - Dependency checking utility
  // Needed: checks if dependencies are installed, needs try/catch for module resolution
  "test/ensure-deps.js:26",

  // test/integration/pages-yml-validation.test.js - Git clone may fail in offline environments
  // Needed: gracefully skips validation when GitHub is not reachable
  "test/integration/pages-yml-validation.test.js:45",

  // Pre-existing catches surfaced when this gate's coverage was extended to
  // scripts/ and bin/ - baseline entries, not new debt. Each one handles the
  // error loudly or with documented degradation, never by masking:
  // CLI arg-parse errors become a friendly usage message + exit 1
  "scripts/customise-cms/index.js:179",
  // Two justified catches: restoreAll must keep restoring the other
  // mutated files after one write fails (printed, fails the run via
  // process.exitCode), and a spawn failure means a mutant's tests never
  // ran, so sources are restored and the whole run fails loudly instead
  // of scoring a false pass.
  "scripts/mutation/runner.js:384",
  "scripts/mutation/runner.js:405",
  // GitHub step summary is best-effort cosmetics; a write failure must not
  // fail the mutation run (covered by an explicit test)
  "scripts/mutation/summary.js:219",

  // test/test-utils/assertions.js - expectAsyncThrows is the sanctioned
  // try/catch replacement for asserting async errors in tests
  "test/test-utils/assertions.js:127",
]);

// ============================================
// process.cwd() exceptions (test files only)
// ============================================

// Test files that legitimately need process.cwd() instead of rootDir.
// Most tests should import rootDir from test-utils.js instead.
const ALLOWED_PROCESS_CWD = frozenSet([
  // withChdirAsync must save and restore the real process.cwd()
  "test/test-utils/resource.js",
]);

// ============================================
// Single-use unexported function exceptions
// ============================================

// Files with single-use functions that are intentionally kept for clarity.
// Remove files from this list as you refactor them.
const ALLOWED_SINGLE_USE_FUNCTIONS = frozenSet([
  // extractStringContent is a ~200-line string-scanning state machine with a
  // single caller; nesting it inside findHtmlInJs would bury the scanner, and
  // splitting it would only create new single-use functions.
  "test/unit/code-quality/html-in-js.test.js",
  // Nesting these helpers into their callers pushes the containing functions
  // (configureFileUtils, createHtmlTransform) past the function-length gate:
  // their JSDoc and anonymous shortcode/transform closures dominate own lines.
  "src/_lib/eleventy/file-utils.js", // Filter callbacks extracted for strict type safety
  "src/_lib/eleventy/html-transform.js", // Transform helpers kept separate to manage complexity
]);

// ============================================
// Test-only exports exceptions
// ============================================

// Exports from src/ that are only used in test/ files.
// These indicate tests of implementation details rather than public API.
// Format: "path/to/file.js:exportName"
//
// NOTE: The scanner now detects Eleventy registrations (addFilter, addShortcode, etc.)
// so exports registered with Eleventy no longer need to be listed here.
const ALLOWED_TEST_ONLY_EXPORTS = frozenSet([]);

// ============================================
// Data fallback exceptions
// ============================================

const ALLOWED_DATA_FALLBACKS = frozenSet([]);

// ============================================
// DOM class constructor exceptions
// ============================================

// Files allowed to use `new DOM()` for parsing HTML strings into documents.
// Most DOM tests should use `document` directly (via happy-dom GlobalRegistrator).
// Use `new DOM(html)` only when parsing generated HTML for assertions,
// NOT for mocking the global document.
const ALLOWED_DOM_CONSTRUCTOR = frozenSet([
  // This test file tests these patterns
  "test/unit/code-quality/dom-mocking.test.js",
]);

// ============================================
// Nullish coalescing (??) exceptions
// ============================================

// Files outside src/_lib/collections/ that use the ?? operator.
// Default values should be set early in the data chain (in collections).
// These are grandfathered usages that should be refactored over time.
const ALLOWED_NULLISH_COALESCING = frozenSet([
  // src/_data - user-facing data boundary (frontmatter from markdown files)
  // These are legitimate exceptions per CLAUDE.md: "User-provided input at system boundaries"
  "src/_data/eleventyComputed.js", // order, faqs, tab.body, metaComputed defaults
]);

export {
  ALLOWED_DATA_FALLBACKS,
  ALLOWED_DOM_CONSTRUCTOR,
  ALLOWED_NULLISH_COALESCING,
  ALLOWED_PROCESS_CWD,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_TEST_ONLY_EXPORTS,
  ALLOWED_TRY_CATCHES,
};
