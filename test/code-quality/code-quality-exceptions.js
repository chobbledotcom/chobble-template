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

// ============================================
// try/catch exceptions
// ============================================

// Add file:line for specific locations, or just file path to allow all try/catch in that file
const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:289",

  // src/_lib/public/utils/http.js - centralized HTTP error handling (entire file)
  "src/_lib/public/utils/http.js",

  // src/_lib/public/utils/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/_lib/public/utils/cart-utils.js:13",

  // test/test-site-factory.test.js - Testing error handling behavior
  // Needed: test intentionally catches errors to verify error handling works correctly
  "test/integration/test-site-factory.test.js:135",
  "test/integration/test-site-factory.test.js:155",
  "test/integration/test-site-factory.test.js:277",

  // test/ensure-deps.js - Dependency checking utility
  // Needed: checks if dependencies are installed, needs try/catch for module resolution
  "test/ensure-deps.js:16",

  // test/code-scanner.js - Exception validation
  // Needed: validates exception entries by reading files that might not exist
  "test/code-scanner.js:334",

  // test/test-utils.js - Test utility definitions (test infrastructure)
  // Needed: expectAsyncThrows helper uses try/catch for idiomatic async error testing
  "test/test-utils.js",
]);

// ============================================
// HTML in JavaScript exceptions
// ============================================

// Files that are allowed to contain HTML in JavaScript template literals.
// These should be refactored over time to use external templates.
const ALLOWED_HTML_IN_JS = new Set([
  // Server-side Eleventy plugins generating HTML
  "src/_lib/eleventy/recurring-events.js",
]);

// ============================================
// process.cwd() exceptions (test files only)
// ============================================

// Test files that legitimately need process.cwd() instead of rootDir.
// Most tests should import rootDir from test-utils.js instead.
const ALLOWED_PROCESS_CWD = new Set([
  // Tests that specifically test file-utils.js which uses process.cwd() internally
  "test/unit/utils/file-utils.test.js",
]);

// ============================================
// Mutable const exceptions (empty [], {}, Set, Map)
// ============================================

// Const declarations that create mutable containers (arrays, objects, Sets, Maps).
// While const prevents reassignment, these containers can still be mutated.
// Prefer functional patterns: map, filter, reduce, spread, etc.
const ALLOWED_MUTABLE_CONST = new Set([
  // Maps - used as caches/indexes being populated via set
  "src/_lib/utils/memoize.js:8", // memoization cache (fundamental to memoize utility)
  "ecommerce-backend/server.js:87", // SKU prices cache with expiry tracking

  // Test utilities - entire files allowed for imperative test patterns
  "test/test-utils.js",
  "test/build-profiling.js",
  "test/precommit.js",
  "test/run-tests.js",
  "test/test-runner-utils.js",
  "test/code-scanner.js",
  "test/unit/utils/schema-helper-utils.js",
  "test/unit/collections/events-utils.js",
  "test/unit/frontend/quote-steps-utils.js",
  "test/unit/code-quality/code-quality-utils.js",

  // Test files - imperative accumulation patterns for test setup/assertions
  "test/unit/build/cache-buster.test.js",
  "test/integration/build/pdf-integration.test.js",
  "test/unit/build/pdf.test.js",
  "test/unit/build/scss.variables.test.js",
  "test/unit/code-quality/array-push.test.js",
  "test/code-quality/code-quality-exceptions.js",
  "test/unit/code-quality/code-scanner.test.js",
  "test/unit/code-quality/commented-code.test.js",
  "test/unit/code-quality/data-exports.test.js",
  "test/unit/code-quality/function-length.test.js",
  "test/unit/code-quality/html-in-js.test.js",
  "test/unit/code-quality/let-usage.test.js",
  "test/unit/code-quality/method-aliasing.test.js",
  "test/unit/code-quality/naming-conventions.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/test-only-exports.test.js",
  "test/unit/code-quality/test-hygiene.test.js",
  "test/unit/code-quality/test-quality.test.js",
  "test/unit/code-quality/todo-fixme-comments.test.js",
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/test-runner-utils.test.js",
  "test/unit/test-utils.test.js",
  "test/unit/collections/categories.test.js",
  "test/unit/collections/missing-folders-lib.test.js",
  "test/unit/collections/properties.test.js",
  "test/integration/eleventy/feed.test.js",
  "test/unit/eleventy/layout-aliases.test.js",
  "test/unit/filters/item-filters.test.js",
  "test/unit/frontend/checkout.test.js",
  "test/unit/frontend/config.test.js",
  "test/unit/frontend/quote-steps.test.js",
  "test/unit/frontend/theme-editor.test.js",
  "test/unit/utils/grouping.test.js",
  "test/unit/utils/helpers.test.js",
  "test/unit/utils/object-entries.test.js",
  "test/unit/utils/strings.test.js",
  "ecommerce-backend/server.test.js",
]);

// ============================================
// Let declarations exceptions
// ============================================

// Files that use 'let' for mutable variables.
// Prefer functional patterns (map/filter/reduce) or const with immutable updates.
// Only 'let moduleName = null;' is allowed for lazy loading without exceptions.
const ALLOWED_LET = new Set([
  // Test files with mutable state tracking
  "test/integration/build/pdf-integration.test.js",
  "test/integration/eleventy/feed.test.js",
  "test/unit/build/pdf.test.js",
  "test/unit/frontend/gallery.test.js",
  "test/unit/frontend/hire-calculator.test.js",
  "test/unit/frontend/scroll-fade.test.js",
  "test/unit/frontend/cart.test.js",
  "test/unit/frontend/turbo.test.js",
  "test/unit/frontend/slider.test.js",
  "test/unit/frontend/search.test.js",
  "test/unit/frontend/quote-checkout.test.js",
  "test/unit/code-quality/code-scanner.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/html-in-js.test.js",
  "test/unit/code-quality/commented-code.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/let-usage.test.js", // Test file has let in test cases
  "test/unit/code-quality/unused-classes.test.js",
  "test/test-site-factory.js",
  "test/integration/test-site-factory.test.js",
  "test/precommit.js",
  "test/test-utils.js",
  "test/code-scanner.js",
  "ecommerce-backend/server.test.js",
]);

// ============================================
// Single-use unexported function exceptions
// ============================================

// Files with single-use functions that are intentionally kept for clarity.
// Remove files from this list as you refactor them.
const ALLOWED_SINGLE_USE_FUNCTIONS = new Set([
  "ecommerce-backend/server.js",
  "src/_data/eleventyComputed.js",
  "src/_lib/build/scss.js",
  "src/_lib/collections/categories.js",
  "src/_lib/collections/menus.js",
  "src/_lib/collections/navigation.js",
  "src/_lib/collections/products.js",
  "src/_lib/collections/search.js",
  "src/_lib/eleventy/responsive-tables.js",
  "src/_lib/filters/item-filters.js",
  "src/_lib/utils/dom-builder.js", // Kept separate to manage complexity
  "src/_lib/utils/product-cart-data.js", // Helpers for cart attribute building
  "src/_lib/public/ui/availability-calendar.js",
  "src/_lib/public/utils/cart-utils.js",
  "src/_lib/public/cart/cart.js",
  "src/_lib/public/ui/gallery.js",
  "src/_lib/public/cart/hire-calculator.js",
  "src/_lib/public/cart/quote-checkout.js",
  "src/_lib/public/utils/quote-price-utils.js",
  "src/_lib/public/cart/quote.js",
  "src/_lib/public/cart/quote-steps.js",
  "src/_lib/public/ui/scroll-fade.js",
  "src/_lib/public/ui/search.js",
  "src/_lib/public/ui/slider.js",
  "src/_lib/public/cart/stripe-checkout.js",
  "src/_lib/public/theme/theme-editor-lib.js",
  "test/unit/code-quality/knip.test.js",
  "test/unit/code-quality/test-only-exports.test.js",
]);

// ============================================
// Test-only exports exceptions
// ============================================

// Exports from src/ that are only used in test/ files.
// These indicate tests of implementation details rather than public API.
// Format: "path/to/file.js:exportName"
const ALLOWED_TEST_ONLY_EXPORTS = new Set([
  // Build utilities - tested directly for build pipeline verification
  "src/_lib/build/scss.js:compileScss",
  "src/_lib/build/scss.js:configureScss",
  "src/_lib/build/scss.js:createScssCompiler",

  // Collection configure functions - tested to verify Eleventy registration
  "src/_lib/collections/events.js:configureEvents",
  "src/_lib/collections/events.js:getFeaturedEvents",
  "src/_lib/collections/guides.js:configureGuides",
  "src/_lib/collections/guides.js:guidesByCategory",
  "src/_lib/collections/locations.js:configureLocations",
  "src/_lib/collections/locations.js:getRootLocations",
  "src/_lib/collections/locations.js:getSiblingLocations",
  "src/_lib/collections/menus.js:configureMenus",
  "src/_lib/collections/menus.js:getCategoriesByMenu",
  "src/_lib/collections/menus.js:getItemsByCategory",
  "src/_lib/collections/navigation.js:configureNavigation",
  "src/_lib/collections/navigation.js:createNavigationFilter",
  "src/_lib/collections/navigation.js:findPageUrl",
  "src/_lib/collections/news.js:configureNews",
  "src/_lib/collections/news.js:createNewsCollection",
  "src/_lib/collections/tags.js:configureTags",
  "src/_lib/collections/tags.js:extractTags",

  // Config helpers - tested for form/quote field logic
  "src/_lib/config/form-helpers.js:getFieldTemplate",
  "src/_lib/config/quote-fields-helpers.js:buildSections",

  // Eleventy plugin configure functions - tested for plugin registration
  "src/_lib/eleventy/cache-buster.js:cacheBust",
  "src/_lib/eleventy/cache-buster.js:configureCacheBuster",
  "src/_lib/eleventy/capture.js:configureCapture",
  "src/_lib/eleventy/feed.js:configureFeed",
  "src/_lib/eleventy/ical.js:configureICal",
  "src/_lib/eleventy/ical.js:eventIcal",
  "src/_lib/eleventy/ical.js:isOneOffEvent",
  "src/_lib/eleventy/js-config.js:buildJsConfigJson",
  "src/_lib/eleventy/js-config.js:configureJsConfig",
  "src/_lib/eleventy/layout-aliases.js:configureLayoutAliases",
  "src/_lib/eleventy/opening-times.js:configureOpeningTimes",
  "src/_lib/eleventy/opening-times.js:renderOpeningTimes",
  "src/_lib/eleventy/pdf.js:buildMenuPdfData",
  "src/_lib/eleventy/pdf.js:configurePdf",
  "src/_lib/eleventy/pdf.js:createMenuPdfTemplate",
  "src/_lib/eleventy/pdf.js:generateMenuPdf",
  "src/_lib/eleventy/responsive-tables.js:configureResponsiveTables",

  // Media processing - tested for image handling
  "src/_lib/media/image.js:configureImages",
  "src/_lib/media/image.js:createImageTransform",
  "src/_lib/media/image.js:imageShortcode",
  "src/_lib/media/inline-asset.js:configureInlineAsset",
  "src/_lib/media/unused-images.js:configureUnusedImages",

  // Path constants - used in test utilities
  "src/_lib/paths.js:DATA_DIR",
  "src/_lib/paths.js:ROOT_DIR",
  "src/_lib/paths.js:SRC_DIR",

  // Theme editor internals - tested for UI component behavior
  "src/_lib/public/theme/theme-editor-config.js:GLOBAL_INPUTS",
  "src/_lib/public/theme/theme-editor-config.js:SCOPE_DEFINITIONS",
  "src/_lib/public/theme/theme-editor-config.js:SCOPED_INPUTS",
  "src/_lib/public/theme/theme-editor-lib.js:SCOPE_SELECTORS",

  // Public UI components - tested for frontend behavior
  "src/_lib/public/ui/quote-steps-progress.js:initStandaloneProgress",
  "src/_lib/public/utils/cart-utils.js:getItemCount",
  "src/_lib/public/utils/cart-utils.js:removeItem",
]);

// ============================================
// DOM class constructor exceptions
// ============================================

// Files allowed to use `new DOM()` for parsing HTML strings into documents.
// Most DOM tests should use `document` directly (via happy-dom GlobalRegistrator).
// Use `new DOM(html)` only when parsing generated HTML for assertions,
// NOT for mocking the global document.
const ALLOWED_DOM_CONSTRUCTOR = new Set([
  // Infrastructure: DOM class definition
  "test/test-utils.js:10",

  // Parsing build output into queryable documents
  "test/test-site-factory.js:327",

  // Parsing generated HTML for assertions
  "test/unit/code-quality/template-selectors.test.js:55",
  "test/integration/eleventy/recurring-events.test.js:49",

  // This test file tests these patterns
  "test/unit/code-quality/dom-mocking.test.js",
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_HTML_IN_JS,
  ALLOWED_PROCESS_CWD,
  ALLOWED_MUTABLE_CONST,
  ALLOWED_LET,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_DOM_CONSTRUCTOR,
  ALLOWED_TEST_ONLY_EXPORTS,
};
