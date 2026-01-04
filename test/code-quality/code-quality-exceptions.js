/**
 * Centralized code quality exceptions
 *
 * All whitelisted/grandfathered code quality violations are defined here.
 * These should be removed over time as the codebase is refactored.
 */

// ============================================
// try/catch exceptions
// ============================================

// Add file:line for specific locations, or just file path to allow all try/catch in that file
const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:289",

  // src/assets/js/http.js - centralized HTTP error handling (entire file)
  "src/assets/js/http.js",

  // src/assets/js/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/assets/js/cart-utils.js:11",
]);

// ============================================
// HTML in JavaScript exceptions
// ============================================

// Files that are allowed to contain HTML in JavaScript template literals.
// These should be refactored over time to use external templates.
const ALLOWED_HTML_IN_JS = new Set([
  // Server-side Eleventy plugins generating HTML
  "src/_lib/eleventy/opening-times.js",
  "src/_lib/eleventy/recurring-events.js",
  "src/_lib/eleventy/js-config.js",
  "src/_lib/eleventy/responsive-tables.js",

  // Collections with embedded HTML/SVG
  "src/_lib/collections/reviews.js",

  // Filters with HTML formatting
  "src/_lib/filters/item-filters.js",
]);

// ============================================
// Console.log exceptions
// ============================================

// Files that are allowed to use console.* for legitimate purposes.
const ALLOWED_CONSOLE = new Set([
  // CLI scripts need console output for user feedback
  "bin/add-skus",
  "src/_lib/media/unused-images.js",

  // Build-time logging for PDF generation progress
  "src/_lib/eleventy/pdf.js",

  // Browser-side error handling (caught errors need to be logged somewhere)
  "src/assets/js/cart-utils.js",

  // ecommerce backend server logging
  "ecommerce-backend/server.js",
]);

// ============================================
// Relative path exceptions
// ============================================

// Files allowed to use ".." for path navigation.
// The paths utility is the ONLY source file allowed - it provides paths for everyone else.
// Test infrastructure files need ".." to reference project root.
const ALLOWED_RELATIVE_PATHS = new Set([
  // Source: centralized path utility (the one exception - provides paths for others)
  "src/_lib/paths.js",

  // Test infrastructure - calculates rootDir for all other tests to import
  "test/test-utils.js",
  "test/test-site-factory.js",
  "test/run-all-tests.js",
  "test/run-coverage.js",
]);

// ============================================
// process.cwd() exceptions (test files only)
// ============================================

// Test files that legitimately need process.cwd() instead of rootDir.
// Most tests should import rootDir from test-utils.js instead.
const ALLOWED_PROCESS_CWD = new Set([
  // Tests that specifically test file-utils.js which uses process.cwd() internally
  "test/utils/file-utils.test.js",
]);

// ============================================
// Mutable const exceptions (empty [], {}, Set, Map)
// ============================================

// Const declarations that create mutable containers (arrays, objects, Sets, Maps).
// While const prevents reassignment, these containers can still be mutated.
// Prefer functional patterns: map, filter, reduce, spread, etc.
const ALLOWED_MUTABLE_CONST = new Set([
  // Empty arrays - being populated via push/mutation
  "src/assets/js/autosizes.js:135", // newImages array built with push
  "src/assets/js/theme-editor.js:400", // bodyClasses array built with push

  // Empty objects - being populated via property assignment
  "src/assets/js/theme-editor-lib.js:22", // vars object built with property assignment
  "src/assets/js/theme-editor-lib.js:159", // vars object built with property assignment
  "src/assets/js/theme-editor.js:142", // vars object built with property assignment
  "src/assets/js/theme-editor.js:367", // globalVars object built with property assignment
  "src/assets/js/theme-editor.js:388", // scopeVars object built with property assignment
  "src/assets/js/theme-editor.js:462", // vars object built with property assignment
  "src/_data/altTagsLookup.js:6", // lookup object built with property assignment
  "src/_lib/filters/item-filters.js:357", // redirects object built with property assignment
  "src/_lib/utils/grouping.js:80", // lookup object built with property assignment
  "src/_lib/eleventy/js-config.js:10", // jsConfig object built with property assignment

  // Sets - being populated via add/mutation
  "src/_lib/media/unused-images.js:52", // usedImages Set from array
  "src/_lib/collections/products.js:50", // categorySet from array
  "src/assets/js/availability-calendar.js:119", // unavailableSet from array

  // Maps - used as caches/indexes being populated via set
  "src/_lib/utils/memoize.js:5", // memoization cache
  "src/_lib/utils/grouping.js:21", // index Map for grouping
  "src/_lib/utils/grouping.js:51", // groups Map for grouping
  "src/_lib/utils/grouping.js:108", // groups Map for grouping
  "src/_lib/media/image.js:170", // imageHtmlCache for memoization
]);

// ============================================
// let/mutable variable exceptions
// ============================================

// Mutable variables that can't be refactored to immutable patterns.
// let foo = null; for lazy loading is auto-allowed; these are other cases.
// Note: for (let i = ...) loops are not detected (pattern matches line-start let only)
const ALLOWED_LET_USAGE = new Set([
  // theme-editor.js - accumulator in parseBorderValue loop
  "src/assets/js/theme-editor.js:242",
  // theme-editor.js - computed property check in loop
  "src/assets/js/theme-editor.js:286",
  // file-utils.js - content modified by conditional logic
  "src/_lib/eleventy/file-utils.js:49",
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_HTML_IN_JS,
  ALLOWED_CONSOLE,
  ALLOWED_RELATIVE_PATHS,
  ALLOWED_PROCESS_CWD,
  ALLOWED_LET_USAGE,
  ALLOWED_MUTABLE_CONST,
};
