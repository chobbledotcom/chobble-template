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
  // Maps - used as caches/indexes being populated via set
  "src/_lib/utils/memoize.js:5", // memoization cache
  "src/_lib/media/image.js:170", // imageHtmlCache for memoization
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
// Array .push() exceptions
// ============================================

// Files that use .push() for array mutation.
// Prefer functional patterns: map, filter, reduce, spread, concat, etc.
const ALLOWED_ARRAY_PUSH = new Set([
  // (empty - all push usages have been refactored to functional patterns)
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
  "src/assets/js/stripe-checkout.js:31", // checkoutApiUrl

  // === DOM element lookups (querySelector can return null) ===
  "src/assets/js/search.js:13", // form
  "src/assets/js/search.js:16", // keywordsDatalist
  "src/assets/js/availability-calendar.js:117", // content
  "src/assets/js/availability-calendar.js:138", // dialog
  "src/assets/js/theme-switcher.js:87", // button
  "src/assets/js/theme-editor.js:316", // target
  "src/assets/js/theme-editor.js:407", // borderOutput
  "src/assets/js/cart.js:128", // cartItems
  "src/assets/js/shuffle-properties.js:49", // itemsList
  "src/assets/js/quote.js:48", // container
  "src/assets/js/gallery.js:20", // imageLink
  "src/assets/js/gallery.js:30", // fullImage
  "src/assets/js/gallery.js:45", // imageWrapper
  "src/assets/js/gallery.js:56", // content
  "src/assets/js/stripe-checkout.js:16", // main
  "src/assets/js/slider.js:19", // firstItem
  "src/assets/js/scroll-fade.js:35", // selectors

  // === Regex match results (match() returns null on no match) ===
  "src/products/products.11tydata.js:11", // match
  "src/_lib/build/theme-compiler.js:33", // rootMatch
  "src/assets/js/autosizes.js:40", // chromeMatch

  // === Lazy module loading (initially null until loaded) ===
  "src/_lib/build/scss.js:8", // sass
  "src/_lib/media/image.js:13", // sharpModule
  "src/_lib/media/image.js:19", // eleventyImgModule
  "src/_lib/eleventy/pdf.js:20", // pdfRenderer
  "src/_lib/utils/lazy-jsdom.js:7", // HappyDOMWrapper
  "src/_lib/utils/dom-builder.js:7", // sharedDom

  // === External/parsed data (localStorage, API responses, etc) ===
  "src/assets/js/cart-utils.js:8", // cart (from localStorage)
  "src/assets/js/cart-utils.js:61", // item
  "src/assets/js/theme-editor-lib.js:32", // cssText
  "src/assets/js/theme-editor-lib.js:66", // themeContent
  "src/assets/js/theme-editor-lib.js:89", // borderValue
  "src/assets/js/theme-editor-lib.js:164", // value
  "src/assets/js/hire-calculator.js:20", // priceStr
  "src/assets/js/hire-calculator.js:38", // hirePrices
  "src/_lib/filters/spec-filters.js:11", // specName
  "src/_lib/filters/spec-filters.js:14", // iconFile
  "ecommerce-backend/server.js:118", // sku (request param)
  "ecommerce-backend/server.js:121", // skuData (lookup result)
  "src/assets/js/stripe-checkout.js:48", // response
  "src/_lib/eleventy/pdf.js:251", // pdfDoc
  "src/_lib/eleventy/pdf.js:281", // state

  // === Optional function parameters ===
  "src/_lib/filters/item-filters.js:33", // filterAttributes
  "src/_lib/filters/item-filters.js:62", // attrs
  "src/_lib/filters/item-filters.js:107", // path
  "src/_lib/filters/item-filters.js:138", // items
  "src/_lib/filters/item-filters.js:187", // items
  "src/_lib/collections/products.js:6", // gallery
  "src/_lib/collections/products.js:38", // products
  "src/_lib/collections/products.js:58", // products
  "src/_lib/collections/products.js:83", // options
  "src/_lib/collections/menus.js:31", // categories
  "src/_lib/collections/menus.js:36", // items
  "src/_lib/collections/search.js:9", // category
  "src/_lib/collections/search.js:35", // products
  "src/_lib/collections/reviews.js:101", // name
  "src/_lib/collections/tags.js:13", // collection
  "src/_lib/collections/navigation.js:12", // collection
  "src/_lib/collections/navigation.js:18", // result
  "src/_lib/media/image.js:289", // imageFiles
  "src/_lib/utils/schema-helper.js:7", // imageInput
  "src/_lib/utils/canonical-url.js:9", // url
  "src/_lib/utils/slug-utils.js:12", // reference
  "src/_lib/eleventy/area-list.js:19", // url

  // === Test infrastructure ===
  "test/code-scanner.js:209", // result
  "test/code-quality/method-aliasing.test.js:46", // match
  "test/code-quality/method-aliasing.test.js:71", // alias
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_HTML_IN_JS,
  ALLOWED_CONSOLE,
  ALLOWED_RELATIVE_PATHS,
  ALLOWED_PROCESS_CWD,
  ALLOWED_MUTABLE_CONST,
  ALLOWED_OBJECT_MUTATION,
  ALLOWED_ARRAY_PUSH,
  ALLOWED_NULL_CHECKS,
};
