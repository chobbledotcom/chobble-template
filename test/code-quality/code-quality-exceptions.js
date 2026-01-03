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
  "src/_lib/scripts/add-skus.js",
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

  // Test infrastructure - needs __dirname + ".." to find project root
  "test/test-utils.js",
  "test/test-site-factory.js",
  "test/run-all-tests.js",
  "test/run-coverage.js",

  // Tests that need to reference project root or source directories
  "test/strings.test.js",
  "test/checkout.test.js",

  // Code quality tests that need project root access
  "test/code-quality/lockfile.test.js",
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_HTML_IN_JS,
  ALLOWED_CONSOLE,
  ALLOWED_RELATIVE_PATHS,
};
