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

import { frozenSet } from "#toolkit/fp/set.js";

// ============================================
// try/catch exceptions
// ============================================

// Add file:line for specific locations, or just file path to allow all try/catch in that file
const ALLOWED_TRY_CATCHES = frozenSet([
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

  // src/_lib/media/image-external.js - Rick Astley placeholder video thumbnail fallback
  // Needed: external HTTP fetch of YouTube thumbnail can fail on network-restricted environments;
  // for the known placeholder video (Rick Astley), we fall back to a placeholder SVG
  "src/_lib/media/image-external.js:191",
]);

// ============================================
// process.cwd() exceptions (test files only)
// ============================================

// Test files that legitimately need process.cwd() instead of rootDir.
// Most tests should import rootDir from test-utils.js instead.
const ALLOWED_PROCESS_CWD = frozenSet([
  // Tests that specifically test file-utils.js which uses process.cwd() internally
  "test/unit/utils/file-utils.test.js",
]);

// ============================================
// Mutable const exceptions (empty [], {}, Set, Map)
// ============================================

// Const declarations that create mutable containers (arrays, objects, Sets, Maps).
// While const prevents reassignment, these containers can still be mutated.
// Prefer functional patterns: map, filter, reduce, spread, etc.
const ALLOWED_MUTABLE_CONST = frozenSet([
  // Maps - used as caches/indexes being populated via set
  "ecommerce-backend/server.js:87", // SKU prices cache with expiry tracking

  // Test utilities - entire files allowed for imperative test patterns
  "test/test-utils.js:155", // createExtractor accumulates results in a Set
  "test/build-profiling.js",
  "test/test-runner-utils.js",
  "test/code-scanner.js",
  "test/unit/data/eleventy-computed.test.js",

  // Test files - imperative accumulation patterns for test setup/assertions
  "test/unit/build/pdf.test.js",
  "test/unit/build/scss.variables.test.js",
  "test/unit/code-quality/array-push.test.js",
  "test/unit/code-quality/comment-limits.test.js",
  "test/unit/code-quality/let-usage.test.js",
  "test/unit/code-quality/aliasing.test.js",
  "test/unit/code-quality/naming-conventions.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/test-only-exports.test.js",
  "test/unit/code-quality/todo-fixme-comments.test.js",
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/code-quality/design-system-scoping.test.js",
  "test/unit/code-quality/duplicate-methods.test.js",
  "test/unit/test-runner-utils.test.js",
  "test/unit/collections/missing-folders-lib.test.js",
  "test/unit/collections/properties.test.js",
  "test/unit/eleventy/layout-aliases.test.js",
  "test/unit/filters/item-filters.test.js",
  "test/unit/frontend/checkout.test.js",
  "test/unit/frontend/config.test.js",
  "test/unit/utils/object-entries.test.js",
  "test/unit/transforms/images.test.js",
  "test/unit/eleventy/cached-block.test.js",
  "test/unit/toolkit/set.test.js",
]);

// ============================================
// Let declarations exceptions
// ============================================

// Files that use 'let' for mutable variables.
// Prefer functional patterns (map/filter/reduce) or const with immutable updates.
// Only 'let moduleName = null;' is allowed for lazy loading without exceptions.
const ALLOWED_LET = frozenSet([
  // Test files with mutable state tracking
  "test/integration/build/pdf-integration.test.js",
  "test/integration/eleventy/feed.test.js",
  "test/unit/frontend/hire-calculator.test.js",
  "test/unit/code-quality/comment-limits.test.js",
  "test/unit/code-quality/commented-code.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/let-usage.test.js", // Test file has let in test cases
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/code-quality/design-system-scoping.test.js",
  "test/integration/test-site-factory.test.js",
  "test/code-scanner.js",
  "ecommerce-backend/server.test.js",
  "test/unit/transforms/images.test.js",

  // src/_lib/media/image-external.js - let html for try/catch fallback pattern
  "src/_lib/media/image-external.js",
]);

// ============================================
// Single-use unexported function exceptions
// ============================================

// Files with single-use functions that are intentionally kept for clarity.
// Remove files from this list as you refactor them.
const ALLOWED_SINGLE_USE_FUNCTIONS = frozenSet([
  "ecommerce-backend/server.js",
  "src/_lib/config/helpers.js", // Cart mode validators use dispatch table pattern
  "src/_lib/collections/categories.js", // Helpers for category property map building
  "src/_lib/collections/events.js", // Thumbnail resolution from products
  "src/_lib/collections/locations.js", // Thumbnail resolution from child locations
  "src/_lib/collections/menus.js",
  "src/_lib/collections/products.js",
  "src/_lib/collections/reviews.js", // isReviewableTag type guard for TypeScript
  "src/_lib/media/image-external.js", // External wrapper styles helper
  "src/_lib/media/image-utils.js", // buildImgAttributes, buildPictureAttributes - helper functions for prepareImageAttributes
  "src/_lib/eleventy/js-config.js", // buildJsConfigJson kept separate for clarity
  "src/_lib/eleventy/style-bundle.js", // Options parsing helpers for type safety
  "src/_lib/eleventy/link-list.js", // Helpers kept separate for clarity
  "src/_lib/eleventy/html-transform.js", // Transform helpers kept separate to manage complexity
  "src/_lib/filters/category-product-filters.js", // Helpers split for function length and readability
  "src/_lib/filters/item-filters.js",
  "src/_lib/transforms/external-links.js", // attrTuple for TypeScript tuple inference
  "src/_lib/transforms/linkify.js", // Text processing helpers kept separate for clarity
  "src/_lib/utils/dom-builder.js", // Kept separate to manage complexity
  "src/_lib/utils/product-cart-data.js", // Helpers for cart attribute building
  "src/_lib/public/design-system.js", // initVideoFacades kept separate to manage complexity
  "src/_lib/public/ui/availability-calendar.js",
  "src/_lib/public/utils/cart-utils.js",
  "src/_lib/public/cart/cart.js",
  "src/_lib/public/ui/gallery.js",
  "src/_lib/public/cart/hire-calculator.js",
  "src/_lib/public/cart/quote-checkout.js",
  "src/_lib/public/utils/quote-price-utils.js",
  "src/_lib/public/cart/quote.js",
  "src/_lib/public/cart/quote-steps.js",
  "src/_lib/public/ui/search.js",
  "src/_lib/public/ui/slider.js",
  "src/_lib/public/cart/stripe-checkout.js",
  "src/_lib/public/theme/theme-editor-lib.js",
  "test/unit/code-quality/comment-limits.test.js",
  "test/unit/code-quality/duplicate-methods.test.js",
  "test/unit/code-quality/html-in-js.test.js",
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
const ALLOWED_TEST_ONLY_EXPORTS = frozenSet([
  // FP toolkit utilities - used by code-quality/scanner.js via relative import
  // (relative imports aren't detected by our analysis)
  "packages/js-toolkit/fp/object.js:omit",
  "packages/js-toolkit/fp/set.js:frozenSetFrom", // Available for iterable sources
  "packages/js-toolkit/fp/set.js:setHas", // Curried predicate for filter/some/every
  "packages/js-toolkit/fp/set.js:setLacks", // Negated predicate for exclusion

  // Build utilities - tested directly for build pipeline verification
  "src/_lib/build/scss.js:createScssCompiler",

  // Config helpers - tested for form/quote field logic
  "src/_lib/config/form-helpers.js:getFieldTemplate",
  "src/_lib/config/quote-fields-helpers.js:buildSections",

  // Eleventy plugin helpers - internal functions tested directly
  "src/_lib/eleventy/cached-block.js:resetCache",
  "src/_lib/eleventy/cached-block.js:createCachedBlockTag",
  "src/_lib/eleventy/opening-times.js:renderOpeningTimes",
  "src/_lib/eleventy/pdf.js:buildMenuPdfData",
  "src/_lib/eleventy/pdf.js:generateMenuPdf",
  "src/_lib/eleventy/recurring-events.js:renderRecurringEvents",

  // Media processing - tested for image handling
  "src/_lib/media/image-frontmatter.js:isValidImage", // Used by getFirstValidImage, tested directly for edge cases
  "src/_lib/media/image-utils.js:getPathAwareBasename",
  "src/_lib/media/thumbnail-placeholder.js:PLACEHOLDER_COLORS",

  // DOM init functions - auto-called via onReady in production, but exported for unit tests
  // (ES modules execute at import time before tests can set up DOM)
  "src/_lib/public/cart/quote-steps.js:initQuoteSteps",
  "src/_lib/public/ui/quote-steps-progress.js:initStandaloneProgress",

  // Utility functions - tested for shared logic
  "src/_lib/utils/block-schema.js:BLOCK_SCHEMAS", // Schema definitions exported for test verification
  "src/_lib/utils/dom-builder.js:elementToHtml",
  "src/_lib/utils/dom-builder.js:getSharedDocument",

  // Mock helpers - tested directly for FAST_INACCURATE_BUILDS coverage
  "src/_lib/utils/mock-filter-attributes.js:generateMockFilterAttributes",
  "src/_lib/utils/mock-filter-attributes.js:getFilterAttributes",

  // Video utilities - constant and helper exported for test verification
  "src/_lib/utils/video.js:RICK_ASTLEY_VIDEO_ID",
]);

// ============================================
// Data fallback exceptions
// ============================================

const ALLOWED_DATA_FALLBACKS = frozenSet([
  "src/_lib/collections/categories.js:65",
  "src/_lib/collections/events.js:35",
  "src/_lib/collections/products.js:94",
  "src/_lib/collections/search.js:26",
  "src/_lib/eleventy/ical.js:42",
  "src/_lib/eleventy/ical.js:43",
  "src/_lib/eleventy/pdf.js:39",
  "src/_lib/eleventy/pdf.js:74",
  "src/_lib/filters/filter-core.js:186",
  "src/_lib/filters/filter-core.js:197",
  "src/_lib/filters/filter-core.js:203",
  "src/_lib/utils/schema-helper.js:145",
  "src/_lib/utils/schema-helper.js:150",
]);

// ============================================
// DOM class constructor exceptions
// ============================================

// Files allowed to use `new DOM()` for parsing HTML strings into documents.
// Most DOM tests should use `document` directly (via happy-dom GlobalRegistrator).
// Use `new DOM(html)` only when parsing generated HTML for assertions,
// NOT for mocking the global document.
const ALLOWED_DOM_CONSTRUCTOR = frozenSet([
  // Infrastructure: DOM class definition
  "test/test-utils.js:186",

  // Parsing build output into queryable documents
  "test/test-site-factory.js:331",

  // Parsing generated HTML for assertions
  "test/unit/code-quality/template-selectors.test.js:43",

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

  // src/_lib/build - build-time utilities
  "src/_lib/build/scss.js:23", // Lazy module loading pattern
  "src/_lib/build/theme-compiler.js:51", // Theme variables extraction fallback

  // src/_lib/eleventy - Eleventy plugins
  "src/_lib/eleventy/capture.js:32",
  "src/_lib/eleventy/capture.js:39",

  // src/_lib/filters - URL-based filtering, normalize template inputs
  "src/_lib/filters/category-product-filters.js:146", // Default empty array for categories without products
  "src/_lib/filters/category-product-filters.js:205", // Default empty array for pages lookup
  "src/_lib/filters/category-product-filters.js:210", // Normalize null/undefined filters from templates
  "src/_lib/filters/filter-core.js:141",
  "src/_lib/filters/filter-core.js:142",
  "src/_lib/filters/filter-core.js:197",
  "src/_lib/filters/filter-core.js:203",
  "src/_lib/filters/item-filters.js:156", // Normalize null/undefined filters from templates

  // src/_lib/public - frontend JavaScript (browser-side, no collections)
  "src/_lib/public/cart/cart.js:104",
  "src/_lib/public/cart/cart.js:105",
  "src/_lib/public/ui/autosizes.js:70",

  // src/_lib/utils - utility functions
  "src/_lib/utils/collection-utils.js:82",
  "src/_lib/utils/sorting.js:67", // eleventyNavigation.order (separate from item order)
]);

// ============================================
// OR fallback exceptions (|| [], || {}, || "", || null, || 0)
// ============================================

// Files that use || fallback patterns. Defaults should be set in collections
// or computed data, not scattered throughout the codebase. These are
// grandfathered usages that should be refactored over time.
const ALLOWED_OR_FALLBACKS = frozenSet([
  // src/_lib/config - config boundary validation
  "src/_lib/config/helpers.js:47", // products || {} - defensive at config boundary

  // src/_lib/eleventy - build-time generation with optional data
  "src/_lib/eleventy/ical.js:42", // subtitle || meta_description || "" - optional event description
  "src/_lib/eleventy/ical.js:43", // event_location || "" - optional location field
  "src/_lib/eleventy/pdf.js:26", // menuItems || [] - menu may have no items
  "src/_lib/eleventy/pdf.js:31", // menuCategories || [] - menu may have no categories
  "src/_lib/eleventy/pdf.js:39", // description || "" - optional item description
  "src/_lib/eleventy/pdf.js:74", // subtitle || "" - optional menu subtitle

  // src/_lib/filters - cascading field access for display
  "src/_lib/filters/filter-core.js:186", // title || name || "" - items have title OR name

  // src/_lib/media - image processing
  "src/_lib/media/thumbnail-placeholder.js:23", // itemPath || "" - path used for color generation
  "src/_lib/media/unused-images.js:35", // .match() || [] - regex returns null on no match

  // src/_lib/utils - mock filter attributes for fast builds
  "src/_lib/utils/mock-filter-attributes.js:15", // inputPath || "" - handle undefined/null input

  // src/_lib/utils - serialization utilities
  "src/_lib/utils/product-cart-data.js:125", // max_quantity || null - explicit null in JSON
  "src/_lib/utils/product-cart-data.js:126", // sku || null - explicit null in JSON
  "src/_lib/utils/product-cart-data.js:127", // days || null - explicit null in JSON
  "src/_lib/utils/schema-helper.js:109", // image cascade || null - intentional "first available or null"
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_PROCESS_CWD,
  ALLOWED_MUTABLE_CONST,
  ALLOWED_LET,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_DATA_FALLBACKS,
  ALLOWED_DOM_CONSTRUCTOR,
  ALLOWED_TEST_ONLY_EXPORTS,
  ALLOWED_NULLISH_COALESCING,
  ALLOWED_OR_FALLBACKS,
};
