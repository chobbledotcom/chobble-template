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
  "test/integration/test-site-factory.test.js:280",
  "test/integration/test-site-factory.test.js:295",

  // test/ensure-deps.js - Dependency checking utility
  // Needed: checks if dependencies are installed, needs try/catch for module resolution
  "test/ensure-deps.js:16",

  // test/code-scanner.js - Exception validation
  // Needed: validates exception entries by reading files that might not exist
  "test/code-scanner.js:334",
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
  "test/run-coverage.js",
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
  "test/unit/code-quality/null-checks.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/test-hygiene.test.js",
  "test/unit/code-quality/test-quality.test.js",
  "test/unit/code-quality/todo-fixme-comments.test.js",
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/collections/categories.test.js",
  "test/unit/collections/missing-folders-lib.test.js",
  "test/unit/collections/properties.test.js",
  "test/integration/eleventy/feed.test.js",
  "test/integration/eleventy/jsonld-validation.test.js",
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
  "test/integration/eleventy/jsonld-validation.test.js",
  "test/integration/eleventy/feed.test.js",
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
  "test/run-coverage.js",
  "test/test-utils.js",
  "test/code-scanner.js",
  "ecommerce-backend/server.test.js",
]);

// ============================================
// Object mutation via bracket assignment exceptions
// ============================================

// Files that use obj[key] = value for object mutation.
// Prefer functional patterns: reduce with spread, Object.fromEntries, toObject, etc.
const ALLOWED_OBJECT_MUTATION = "src/_lib/public/ui/autosizes.js:123"; // Browser-side image lazy loading - setting DOM element attributes (img[attribute] = img.getAttribute)

// ============================================
// Null check exceptions (if (!x) patterns)
// ============================================

// Simple null/undefined checks that are legitimate because the value
// can genuinely be null/undefined from external sources.
// New code should avoid this pattern unless truly necessary.
const ALLOWED_NULL_CHECKS = new Set([
  // === Environment variables / Config (can be undefined) ===
  "ecommerce-backend/server.js:31", // SITE_HOST
  "ecommerce-backend/server.js:35", // BRAND_NAME
  "ecommerce-backend/server.js:51", // origin (CORS)
  "src/_lib/config/helpers.js:107", // product_mode
  "src/_lib/config/helpers.js:125", // formTarget
  "src/_lib/config/helpers.js:138", // cart_mode
  "src/_lib/public/cart/stripe-checkout.js:46", // checkoutApiUrl

  // === DOM element lookups (querySelector can return null) ===
  "src/_lib/public/ui/search.js:13", // form
  "src/_lib/public/ui/search.js:16", // keywordsDatalist
  "src/_lib/public/ui/availability-calendar.js:117", // content
  "src/_lib/public/ui/availability-calendar.js:138", // dialog
  "src/_lib/public/theme/theme-switcher.js:68", // button
  "src/_lib/public/theme/theme-editor.js:284", // target
  "src/_lib/public/theme/theme-editor.js:384", // borderOutput
  "src/_lib/public/cart/cart.js:136", // cartItems
  "src/_lib/public/ui/shuffle-properties.js:13", // itemsList
  "src/_lib/public/cart/quote.js:49", // container
  "src/_lib/public/ui/gallery.js:20", // imageLink
  "src/_lib/public/ui/gallery.js:30", // fullImage
  "src/_lib/public/ui/gallery.js:45", // imageWrapper
  "src/_lib/public/ui/gallery.js:56", // content
  "src/_lib/public/cart/stripe-checkout.js:34", // main
  "src/_lib/public/ui/slider.js:19", // firstItem
  "src/_lib/public/ui/scroll-fade.js:35", // selectors

  // === Regex match results (match() returns null on no match) ===
  "src/products/products.11tydata.js:11", // match
  "src/_lib/build/theme-compiler.js:33", // rootMatch
  "src/_lib/public/ui/autosizes.js:40", // chromeMatch

  // === External/parsed data (localStorage, API responses, etc) ===
  "src/_lib/public/utils/cart-utils.js:10", // cart (from localStorage)
  "src/_lib/public/utils/cart-utils.js:55", // item (from array find)
  "src/_lib/public/theme/theme-editor-lib.js:32", // cssText
  "src/_lib/public/theme/theme-editor-lib.js:48", // themeContent
  "src/_lib/public/theme/theme-editor-lib.js:85", // borderValue
  "src/_lib/public/theme/theme-editor-lib.js:157", // value
  "src/_lib/public/utils/quote-price-utils.js:22", // priceStr
  "src/_lib/filters/spec-filters.js:11", // specName
  "src/_lib/filters/spec-filters.js:14", // iconFile
  "ecommerce-backend/server.js:118", // sku (request param)
  "ecommerce-backend/server.js:121", // skuData (lookup result)
  "src/_lib/public/cart/stripe-checkout.js:19", // response
  "src/_lib/eleventy/pdf.js:229", // pdfDoc (renderer result)

  // === Optional function parameters ===
  "src/_lib/filters/item-filters.js:33", // filterAttributes
  "src/_lib/filters/item-filters.js:62", // attrs
  "src/_lib/filters/item-filters.js:102", // path
  "src/_lib/collections/products.js:75", // options (line shifted by typedef comment)
  "src/_lib/collections/reviews.js:88", // name
  "src/_lib/collections/navigation.js:13", // collection
  "src/_lib/collections/navigation.js:19", // result
  "src/_lib/utils/slug-utils.js:12", // reference
  "src/_lib/eleventy/area-list.js:19", // url

  // === Test infrastructure ===
  "test/unit/code-quality/method-aliasing.test.js:50", // match (in parseAlias)
  "test/unit/code-quality/method-aliasing.test.js:71", // alias (in parseAlias)
  "test/test-runner-utils.js:49", // trimmed (line processing)
  "test/test-runner-utils.js:139", // result (skip if step wasn't run)
  "test/test-runner-utils.js:186", // allPassed (check if all steps passed)
  "test/demo-precommit-errors.js:26", // functionMatch (regex match can be null)
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
  "src/_lib/utils/lazy-loader.js", // Kept separate to manage complexity
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
  ALLOWED_OBJECT_MUTATION,
  ALLOWED_NULL_CHECKS,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_DOM_CONSTRUCTOR,
};
