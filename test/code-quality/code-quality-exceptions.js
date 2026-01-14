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
  "src/_lib/utils/memoize.js:13", // memoization cache (fundamental to memoize utility)
  "ecommerce-backend/server.js:87", // SKU prices cache with expiry tracking

  // Test utilities - entire files allowed for imperative test patterns
  "test/test-utils.js",
  "test/build-profiling.js",
  "test/precommit.js",
  "test/run-tests.js",
  "test/test-runner-utils.js",
  "test/code-scanner.js",
  "test/unit/utils/schema-helper-utils.js",
  "test/unit/data/eleventy-computed.test.js",
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
  "test/unit/code-quality/comment-limits.test.js",
  "test/unit/code-quality/commented-code.test.js",
  "test/unit/code-quality/data-exports.test.js",
  "test/unit/code-quality/function-length.test.js",
  "test/unit/code-quality/html-in-js.test.js",
  "test/unit/code-quality/let-usage.test.js",
  "test/unit/code-quality/method-aliasing.test.js",
  "test/unit/code-quality/naming-conventions.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/memoize-inside-function.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/test-only-exports.test.js",
  "test/unit/code-quality/test-hygiene.test.js",
  "test/unit/code-quality/test-quality.test.js",
  "test/unit/code-quality/todo-fixme-comments.test.js",
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/code-quality/design-system-scoping.test.js",
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
  "test/unit/frontend/slider.test.js",
  "test/unit/frontend/search.test.js",
  "test/unit/frontend/quote-checkout.test.js",
  "test/unit/code-quality/code-scanner.test.js",
  "test/unit/code-quality/single-use-functions.test.js",
  "test/unit/code-quality/memoize-inside-function.test.js",
  "test/unit/code-quality/html-in-js.test.js",
  "test/unit/code-quality/comment-limits.test.js",
  "test/unit/code-quality/commented-code.test.js",
  "test/unit/code-quality/template-selectors.test.js",
  "test/unit/code-quality/let-usage.test.js", // Test file has let in test cases
  "test/unit/code-quality/unused-classes.test.js",
  "test/unit/code-quality/design-system-scoping.test.js",
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
  "src/_lib/build/theme-compiler.js", // extractRootVariables kept separate for clarity
  "src/_lib/collections/categories.js",
  "src/_lib/collections/menus.js",
  "src/_lib/collections/navigation.js",
  "src/_lib/collections/products.js",
  "src/_lib/collections/reviews.js", // extractInitials kept separate to avoid complexity
  "src/_lib/collections/search.js",
  "src/_lib/eleventy/ical.js", // isOneOffEvent kept separate for clarity
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
  "test/unit/code-quality/comment-limits.test.js",
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
  "src/_lib/collections/categories.js:assignCategoryImages",
  "src/_lib/collections/categories.js:buildCategoryImageMap",
  "src/_lib/collections/categories.js:configureCategories",
  "src/_lib/collections/categories.js:createCategoriesCollection",
  "src/_lib/collections/categories.js:getFeaturedCategories",
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
  "src/_lib/collections/navigation.js:findPageUrl",
  "src/_lib/collections/navigation.js:toNavigation",
  "src/_lib/collections/news.js:configureNews",
  "src/_lib/collections/news.js:createNewsCollection",
  "src/_lib/collections/products.js:configureProducts",
  "src/_lib/collections/products.js:createApiSkusCollection",
  "src/_lib/collections/products.js:createProductsCollection",
  "src/_lib/collections/products.js:getFeaturedProducts",
  "src/_lib/collections/products.js:getProductsByCategories",
  "src/_lib/collections/products.js:getProductsByCategory",
  "src/_lib/collections/products.js:getProductsByEvent",
  "src/_lib/collections/products.js:processGallery",
  "src/_lib/collections/properties.js:configureProperties",
  "src/_lib/collections/properties.js:createPropertiesCollection",
  "src/_lib/collections/properties.js:getFeaturedProperties",
  "src/_lib/collections/properties.js:getPropertiesByLocation",
  "src/_lib/collections/properties.js:propertiesWithReviewsPage",
  "src/_lib/collections/properties.js:propertyReviewsRedirects",
  "src/_lib/collections/reviews.js:configureReviews",
  "src/_lib/collections/reviews.js:countReviews",
  "src/_lib/collections/reviews.js:createReviewsCollection",
  "src/_lib/collections/reviews.js:getRating",
  "src/_lib/collections/reviews.js:ratingToStars",
  "src/_lib/collections/reviews.js:reviewerAvatar",
  "src/_lib/collections/search.js:configureSearch",
  "src/_lib/collections/search.js:createSearchKeywordsCollection",
  "src/_lib/collections/search.js:getAllKeywords",
  "src/_lib/collections/search.js:getProductsByKeyword",
  "src/_lib/collections/search.js:normaliseCategory",
  "src/_lib/collections/tags.js:configureTags",
  "src/_lib/collections/tags.js:extractTags",

  // Config helpers - tested for form/quote field logic and validation
  "src/_lib/config/form-helpers.js:getFieldTemplate",
  "src/_lib/config/helpers.js:VALID_CART_MODES",
  "src/_lib/config/helpers.js:VALID_PRODUCT_MODES",
  "src/_lib/config/helpers.js:cartModeError",
  "src/_lib/config/helpers.js:checkFrontmatterField",
  "src/_lib/config/helpers.js:extractFrontmatter",
  "src/_lib/config/helpers.js:getPagePath",
  "src/_lib/config/helpers.js:validateCheckoutApiUrl",
  "src/_lib/config/helpers.js:validatePageFrontmatter",
  "src/_lib/config/helpers.js:validateProductMode",
  "src/_lib/config/helpers.js:validateQuoteConfig",
  "src/_lib/config/helpers.js:validateQuotePages",
  "src/_lib/config/helpers.js:validateStripePages",
  "src/_lib/config/quote-fields-helpers.js:buildSections",

  // Eleventy plugin configure functions - tested for plugin registration
  "src/_lib/eleventy/area-list.js:configureAreaList",
  "src/_lib/eleventy/area-list.js:filterTopLevelLocations",
  "src/_lib/eleventy/area-list.js:formatListWithAnd",
  "src/_lib/eleventy/area-list.js:isTopLevelLocation",
  "src/_lib/eleventy/area-list.js:prepareAreaList",
  "src/_lib/eleventy/area-list.js:sortByNavigationKey",
  "src/_lib/eleventy/cache-buster.js:cacheBust",
  "src/_lib/eleventy/cache-buster.js:configureCacheBuster",
  "src/_lib/eleventy/capture.js:configureCapture",
  "src/_lib/eleventy/external-links.js:configureExternalLinks",
  "src/_lib/eleventy/external-links.js:createExternalLinksTransform",
  "src/_lib/eleventy/external-links.js:externalLinkFilter",
  "src/_lib/eleventy/external-links.js:getExternalLinkAttributes",
  "src/_lib/eleventy/external-links.js:isExternalUrl",
  "src/_lib/eleventy/external-links.js:transformExternalLinks",
  "src/_lib/eleventy/feed.js:configureFeed",
  "src/_lib/eleventy/file-utils.js:configureFileUtils",
  "src/_lib/eleventy/file-utils.js:createMarkdownRenderer",
  "src/_lib/eleventy/file-utils.js:fileExists",
  "src/_lib/eleventy/file-utils.js:fileMissing",
  "src/_lib/eleventy/file-utils.js:readFileContent",
  "src/_lib/eleventy/file-utils.js:renderSnippet",
  "src/_lib/eleventy/ical.js:configureICal",
  "src/_lib/eleventy/ical.js:eventIcal",
  "src/_lib/eleventy/js-config.js:buildJsConfigJson",
  "src/_lib/eleventy/js-config.js:configureJsConfig",
  "src/_lib/eleventy/layout-aliases.js:configureLayoutAliases",
  "src/_lib/eleventy/opening-times.js:configureOpeningTimes",
  "src/_lib/eleventy/opening-times.js:renderOpeningTimes",
  "src/_lib/eleventy/pdf.js:buildMenuPdfData",
  "src/_lib/eleventy/pdf.js:configurePdf",
  "src/_lib/eleventy/pdf.js:createMenuPdfTemplate",
  "src/_lib/eleventy/pdf.js:generateMenuPdf",
  "src/_lib/eleventy/recurring-events.js:configureRecurringEvents",
  "src/_lib/eleventy/recurring-events.js:getEventUrl",
  "src/_lib/eleventy/recurring-events.js:renderRecurringEvents",
  "src/_lib/eleventy/recurring-events.js:stripDatePrefix",
  "src/_lib/eleventy/responsive-tables.js:configureResponsiveTables",
  "src/_lib/eleventy/screenshots.js:configureScreenshots",
  "src/_lib/eleventy/screenshots.js:getDefaultOptions",
  "src/_lib/eleventy/screenshots.js:getViewports",
  "src/_lib/eleventy/screenshots.js:VIEWPORTS",
  "src/_lib/eleventy/style-bundle.js:configureStyleBundle",
  "src/_lib/eleventy/style-bundle.js:getBodyClasses",
  "src/_lib/eleventy/style-bundle.js:getCssBundle",
  "src/_lib/eleventy/style-bundle.js:getJsBundle",
  "src/_lib/eleventy/style-bundle.js:usesDesignSystem",

  // Filter utilities - tested for URL-based filtering logic
  "src/_lib/filters/item-filters.js:buildDisplayLookup",
  "src/_lib/filters/item-filters.js:buildFilterDescription",
  "src/_lib/filters/item-filters.js:buildFilterUIData",
  "src/_lib/filters/item-filters.js:filterToPath",
  "src/_lib/filters/item-filters.js:generateFilterCombinations",
  "src/_lib/filters/item-filters.js:getAllFilterAttributes",
  "src/_lib/filters/item-filters.js:getItemsByFilters",
  "src/_lib/filters/item-filters.js:normalize",
  "src/_lib/filters/item-filters.js:parseFilterAttributes",
  "src/_lib/filters/item-filters.js:pathToFilter",

  // Media processing - tested for image handling
  "src/_lib/media/image.js:configureImages",
  "src/_lib/media/image.js:createImageTransform",
  "src/_lib/media/image.js:imageShortcode",
  "src/_lib/media/inline-asset.js:configureInlineAsset",
  "src/_lib/media/thumbnail-placeholder.js:configureThumbnailPlaceholder",
  "src/_lib/media/thumbnail-placeholder.js:PLACEHOLDER_COLORS",
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

  // Public cart/hire functionality - tested for frontend behavior
  "src/_lib/public/cart/hire-calculator.js:getHireItems",
  "src/_lib/public/cart/hire-calculator.js:hasHireItems",
  "src/_lib/public/cart/hire-calculator.js:isHireItem",
  "src/_lib/public/cart/hire-calculator.js:setMinDate",
  "src/_lib/public/cart/quote-steps.js:buildRadioRecapItem",
  "src/_lib/public/cart/quote-steps.js:clearFieldError",
  "src/_lib/public/cart/quote-steps.js:getCurrentStep",
  "src/_lib/public/cart/quote-steps.js:getFieldDisplayValue",
  "src/_lib/public/cart/quote-steps.js:getFieldLabel",
  "src/_lib/public/cart/quote-steps.js:getFieldWrapper",
  "src/_lib/public/cart/quote-steps.js:getRadioLabel",
  "src/_lib/public/cart/quote-steps.js:initQuoteSteps",
  "src/_lib/public/cart/quote-steps.js:populateRecap",
  "src/_lib/public/cart/quote-steps.js:setFieldError",
  "src/_lib/public/cart/quote-steps.js:updateButtons",
  "src/_lib/public/cart/quote-steps.js:validateField",
  "src/_lib/public/cart/quote-steps.js:validateRadioGroup",
  "src/_lib/public/cart/quote-steps.js:validateStep",

  // Public UI components - tested for frontend behavior
  "src/_lib/public/ui/quote-steps-progress.js:initStandaloneProgress",
  "src/_lib/public/utils/cart-utils.js:getItemCount",
  "src/_lib/public/utils/cart-utils.js:removeItem",
  "src/_lib/public/utils/quote-price-utils.js:calculateTotal",
  "src/_lib/public/utils/quote-price-utils.js:collectFieldDetails",
  "src/_lib/public/utils/quote-price-utils.js:countItems",
  "src/_lib/public/utils/quote-price-utils.js:formatHireLength",
  "src/_lib/public/utils/quote-price-utils.js:formatItemCount",
  "src/_lib/public/utils/quote-price-utils.js:formatItemName",
  "src/_lib/public/utils/quote-price-utils.js:formatItemPrice",
  "src/_lib/public/utils/quote-price-utils.js:getFieldLabel",
  "src/_lib/public/utils/quote-price-utils.js:getFieldValue",
  "src/_lib/public/utils/quote-price-utils.js:getPriceForDays",
  "src/_lib/public/utils/quote-price-utils.js:parsePrice",

  // Utility functions - tested for shared logic
  "src/_lib/utils/dom-builder.js:elementToHtml",
  "src/_lib/utils/dom-builder.js:getSharedDocument",
  "src/_lib/utils/grouping.js:createLookup",
  "src/_lib/utils/object-entries.js:filterObject",
  "src/_lib/utils/object-entries.js:mapObject",
  "src/_lib/utils/object-entries.js:omit",
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
  "test/test-site-factory.js:334",

  // Parsing generated HTML for assertions
  "test/unit/code-quality/template-selectors.test.js:41",

  // This test file tests these patterns
  "test/unit/code-quality/dom-mocking.test.js",
]);

export {
  ALLOWED_TRY_CATCHES,
  ALLOWED_PROCESS_CWD,
  ALLOWED_MUTABLE_CONST,
  ALLOWED_LET,
  ALLOWED_SINGLE_USE_FUNCTIONS,
  ALLOWED_DOM_CONSTRUCTOR,
  ALLOWED_TEST_ONLY_EXPORTS,
};
