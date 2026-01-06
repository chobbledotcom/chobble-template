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

  // test/test-site-factory.test.js - Testing error handling behavior
  // Needed: test intentionally catches errors to verify error handling works correctly
  "test/test-site-factory.test.js:346",

  // test/ensure-deps.js - Dependency checking utility
  // Needed: checks if dependencies are installed, needs try/catch for module resolution
  "test/ensure-deps.js:16",

  // test/code-scanner.js - Exception validation
  // Needed: validates exception entries by reading files that might not exist
  "test/code-scanner.js:319",
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
  // Maps - used as caches/indexes being populated via set
  "src/_lib/utils/memoize.js:8", // memoization cache (fundamental to memoize utility)
  "ecommerce-backend/server.js:87", // SKU prices cache with expiry tracking

  // Test utilities - entire files allowed for imperative test patterns
  "test/test-utils.js",
  "test/build-profiling.js",
  "test/precommit.js",
  "test/code-scanner.js",
  "test/run-coverage.js",

  // Test files - imperative accumulation patterns for test setup/assertions
  "test/build/cache-buster.test.js",
  "test/build/pdf-integration.test.js",
  "test/build/pdf.test.js",
  "test/build/scss.variables.test.js",
  "test/code-quality/array-push.test.js",
  "test/code-quality/code-quality-exceptions.js",
  "test/code-quality/code-scanner.test.js",
  "test/code-quality/commented-code.test.js",
  "test/code-quality/console-log.test.js",
  "test/code-quality/data-exports.test.js",
  "test/code-quality/function-length.test.js",
  "test/code-quality/html-in-js.test.js",
  "test/code-quality/let-usage.test.js",
  "test/code-quality/method-aliasing.test.js",
  "test/code-quality/naming-conventions.test.js",
  "test/code-quality/null-checks.test.js",
  "test/code-quality/single-use-functions.test.js",
  "test/code-quality/template-selectors.test.js",
  "test/code-quality/test-hygiene.test.js",
  "test/code-quality/test-quality.test.js",
  "test/code-quality/todo-fixme-comments.test.js",
  "test/code-quality/unused-classes.test.js",
  "test/collections/categories.test.js",
  "test/collections/missing-folders-lib.test.js",
  "test/collections/properties.test.js",
  "test/eleventy/feed.test.js",
  "test/eleventy/jsonld-validation.test.js",
  "test/eleventy/layout-aliases.test.js",
  "test/filters/item-filters.test.js",
  "test/frontend/checkout.test.js",
  "test/frontend/config.test.js",
  "test/frontend/quote-steps.test.js",
  "test/frontend/theme-editor.test.js",
  "test/utils/grouping.test.js",
  "test/utils/helpers.test.js",
  "test/utils/object-entries.test.js",
  "test/utils/strings.test.js",
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
  "test/build/pdf-integration.test.js",
  "test/eleventy/jsonld-validation.test.js",
  "test/eleventy/feed.test.js",
  "test/frontend/checkout.test.js",
  "test/frontend/quote-steps.test.js",
  "test/frontend/gallery.test.js",
  "test/frontend/hire-calculator.test.js",
  "test/frontend/scroll-fade.test.js",
  "test/frontend/cart.test.js",
  "test/frontend/turbo.test.js",
  "test/frontend/slider.test.js",
  "test/frontend/search.test.js",
  "test/frontend/quote-checkout.test.js",
  "test/code-quality/code-scanner.test.js",
  "test/code-quality/single-use-functions.test.js",
  "test/code-quality/html-in-js.test.js",
  "test/code-quality/commented-code.test.js",
  "test/code-quality/template-selectors.test.js",
  "test/code-quality/let-usage.test.js", // Test file has let in test cases
  "test/code-quality/unused-classes.test.js",
  "test/test-site-factory.js",
  "test/test-site-factory.test.js",
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
const ALLOWED_OBJECT_MUTATION = new Set([
  // Browser-side image lazy loading - setting DOM element attributes
  "src/assets/js/autosizes.js:123", // img[attribute] = img.getAttribute
]);

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
  "src/assets/js/stripe-checkout.js:46", // checkoutApiUrl

  // === DOM element lookups (querySelector can return null) ===
  "src/assets/js/search.js:13", // form
  "src/assets/js/search.js:16", // keywordsDatalist
  "src/assets/js/availability-calendar.js:117", // content
  "src/assets/js/availability-calendar.js:138", // dialog
  "src/assets/js/theme-switcher.js:87", // button
  "src/assets/js/theme-editor.js:293", // target
  "src/assets/js/theme-editor.js:384", // borderOutput
  "src/assets/js/cart.js:136", // cartItems
  "src/assets/js/shuffle-properties.js:49", // itemsList
  "src/assets/js/quote.js:48", // container
  "src/assets/js/quote-steps.js:34", // value (radio recap item)
  "src/assets/js/quote-steps.js:40", // field (field recap item)
  "src/assets/js/quote-steps.js:45", // value (field recap item)
  "src/assets/js/quote-steps.js:123", // isValid (field validation)
  "src/assets/js/quote-steps.js:166", // container (init)
  "src/assets/js/gallery.js:20", // imageLink
  "src/assets/js/gallery.js:30", // fullImage
  "src/assets/js/gallery.js:45", // imageWrapper
  "src/assets/js/gallery.js:56", // content
  "src/assets/js/stripe-checkout.js:34", // main
  "src/assets/js/slider.js:19", // firstItem
  "src/assets/js/scroll-fade.js:35", // selectors

  // === Regex match results (match() returns null on no match) ===
  "src/products/products.11tydata.js:11", // match
  "src/_lib/build/theme-compiler.js:33", // rootMatch
  "src/assets/js/autosizes.js:40", // chromeMatch

  // === Lazy module loading (initially null until loaded) ===
  "src/_lib/build/scss.js:8", // sass
  "src/_lib/media/image-crop.js:12", // sharpModule
  "src/_lib/media/image-lqip.js:11", // eleventyImgModule
  "src/_lib/eleventy/pdf.js:20", // pdfRenderer
  "src/_lib/utils/lazy-jsdom.js:7", // HappyDOMWrapper
  "src/_lib/utils/dom-builder.js:7", // sharedDom

  // === External/parsed data (localStorage, API responses, etc) ===
  "src/assets/js/cart-utils.js:8", // cart (from localStorage)
  "src/assets/js/cart-utils.js:66", // item
  "src/assets/js/theme-editor-lib.js:32", // cssText
  "src/assets/js/theme-editor-lib.js:66", // themeContent
  "src/assets/js/theme-editor-lib.js:89", // borderValue
  "src/assets/js/theme-editor-lib.js:164", // value
  "src/assets/js/hire-calculator.js:22", // priceStr
  "src/assets/js/hire-calculator.js:40", // hirePrices
  "src/_lib/filters/spec-filters.js:11", // specName
  "src/_lib/filters/spec-filters.js:14", // iconFile
  "ecommerce-backend/server.js:118", // sku (request param)
  "ecommerce-backend/server.js:121", // skuData (lookup result)
  "src/assets/js/stripe-checkout.js:19", // response
  "src/_lib/eleventy/pdf.js:251", // pdfDoc
  "src/_lib/eleventy/pdf.js:276", // state

  // === Optional function parameters ===
  "src/_lib/filters/item-filters.js:33", // filterAttributes
  "src/_lib/filters/item-filters.js:62", // attrs
  "src/_lib/filters/item-filters.js:102", // path
  "src/_lib/collections/products.js:6", // gallery
  "src/_lib/collections/products.js:72", // options
  "src/_lib/collections/search.js:9", // category
  "src/_lib/collections/reviews.js:88", // name
  "src/_lib/collections/navigation.js:12", // collection
  "src/_lib/collections/navigation.js:18", // result
  "src/_lib/utils/slug-utils.js:12", // reference
  "src/_lib/eleventy/area-list.js:19", // url

  // === Test infrastructure ===
  "test/code-quality/method-aliasing.test.js:46", // match
  "test/code-quality/method-aliasing.test.js:71", // alias
  "test/test-site-factory.test.js:108", // imageExists (file may not exist)
  "test/test-site-factory.test.js:131", // imageExists (cleanup check)
  "test/run-coverage.js:86", // file (iteration over files)
  "test/precommit.js:53", // trimmed (line processing)
  "test/precommit.js:105", // result (skip if step wasn't run)
  "test/precommit.js:147", // allPassed (check if all steps passed)
]);

// ============================================
// Single-use unexported function exceptions
// ============================================

// Files with single-use functions that are intentionally kept for clarity.
// Remove files from this list as you refactor them.
const ALLOWED_SINGLE_USE_FUNCTIONS = new Set([
  "ecommerce-backend/server.js",
  "src/_data/altTagsLookup.js",
  "src/_data/eleventyComputed.js",
  "src/_data/metaComputed.js",
  "src/_lib/build/scss.js",
  "src/_lib/eleventy/file-utils.js",
  "src/_lib/eleventy/js-config.js",
  "src/_lib/eleventy/pdf.js",
  "src/_lib/eleventy/recurring-events.js",
  "src/_lib/eleventy/responsive-tables.js",
  "src/_lib/filters/item-filters.js",
  "src/_lib/media/image-crop.js",
  "src/_lib/media/image.js",
  "src/_lib/media/unused-images.js",
  "src/_lib/utils/dom-builder.js",
  "src/_lib/utils/schema-helper.js",
  "src/assets/js/availability-calendar.js",
  "src/assets/js/cart-utils.js",
  "src/assets/js/cart.js",
  "src/assets/js/gallery.js",
  "src/assets/js/hire-calculator.js",
  "src/assets/js/quote-checkout.js",
  "src/assets/js/quote.js",
  "src/assets/js/quote-steps.js",
  "src/assets/js/scroll-fade.js",
  "src/assets/js/search.js",
  "src/assets/js/shuffle-properties.js",
  "src/assets/js/slider.js",
  "src/assets/js/stripe-checkout.js",
  "src/assets/js/tabs.js",
  "src/assets/js/theme-editor-lib.js",
  "src/assets/js/theme-editor.js",
  "src/assets/js/theme-switcher.js",
  "src/products/products.11tydata.js",
  "test/code-quality/array-push.test.js",
  "test/code-quality/method-aliasing.test.js",
  "test/code-quality/unused-classes.test.js",
  "test/collections/products.test.js",
  "test/eleventy/recurring-events.test.js",
  "test/utils/strings.test.js",
  "test/test-site-factory.js",
  "test/build-profiling.js",
  "test/test-utils.js",
  "test/run-coverage.js",
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
  "test/test-site-factory.js:322",
  "test/test-site-factory.js:330",

  // Parsing generated HTML for assertions
  "test/code-quality/template-selectors.test.js:55",
  "test/eleventy/recurring-events.test.js:49",

  // This test file tests these patterns
  "test/code-quality/dom-mocking.test.js",
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_HTML_IN_JS,
  ALLOWED_CONSOLE,
  ALLOWED_PROCESS_CWD,
  ALLOWED_MUTABLE_CONST,
  ALLOWED_LET,
  ALLOWED_OBJECT_MUTATION,
  ALLOWED_NULL_CHECKS,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_DOM_CONSTRUCTOR,
};
