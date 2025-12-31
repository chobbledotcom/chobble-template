/**
 * Centralized code quality exceptions
 *
 * All whitelisted/grandfathered code quality violations are defined here.
 * These should be removed over time as the codebase is refactored.
 */

// ============================================
// var/let exceptions
// ============================================

// Files allowed to use var or let freely (third-party, legacy)
const ALLOWED_MUTABLE_VAR_FILES = new Set([
  "src/assets/js/autosizes.js", // Third-party polyfill
  "src/assets/js/search.js", // Legacy search form - uses var throughout
]);

// Specific let patterns that are intentionally allowed (module-level state)
const ALLOWED_LET_PATTERNS = [
  // Module-level state that must be mutable
  /^let\s+(ELEMENTS|PREVIOUS_GLOBAL_VARS)\s*=\s*null/, // theme-editor.js state
  /^let\s+(gallery|currentImage|imagePopup)\s*[,;=]/, // gallery.js DOM refs
  /^let\s+currentPopupIndex\s*=/, // gallery.js state
  // Closure state shared between callbacks - let is clearer than const wrapper
  /^let\s+state\s*=/, // closure state shared between callbacks (e.g., pdf.js)
  /^let\s+paypalToken(Expiry)?\s*=/, // server.js PayPal token cache
];

// ============================================
// try/catch exceptions
// ============================================

const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:290",

  // test/run-all-tests.js - test runner error handling
  "test/run-all-tests.js:15",
  "test/run-all-tests.js:29",

  // ecommerce-backend/server.test.js - test assertions
  "ecommerce-backend/server.test.js:370",

  // test/render-snippet.test.js - test cleanup
  "test/render-snippet.test.js:102",
  "test/render-snippet.test.js:130",

  // src/assets/js/cart.js - localStorage and fetch handling
  "src/assets/js/cart.js:132",
  "src/assets/js/cart.js:181",
  "src/assets/js/cart.js:496",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:331",

  // src/assets/js/stripe-checkout.js - Stripe API
  "src/assets/js/stripe-checkout.js:38",

  // test/test-utils.js - test utilities with cleanup
  "test/test-utils.js:145",
  "test/test-utils.js:162",
  "test/test-utils.js:170",
  "test/test-utils.js:176",

  // test/scss.test.js - SCSS compilation tests
  "test/scss.test.js:42",
  "test/scss.test.js:208",

  // test/navigation.test.js - navigation tests
  "test/navigation.test.js:80",

  // src/assets/js/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/assets/js/cart-utils.js:12",

  // test/checkout.test.js - checkout flow tests
  "test/checkout.test.js:235",
  "test/checkout.test.js:283",
  "test/checkout.test.js:344",
  "test/checkout.test.js:372",
  "test/checkout.test.js:406",
  "test/checkout.test.js:456",
  "test/checkout.test.js:487",
  "test/checkout.test.js:522",
  "test/checkout.test.js:543",
  "test/checkout.test.js:572",
  "test/checkout.test.js:612",
  "test/checkout.test.js:650",
  "test/checkout.test.js:689",

  // test/inline-asset.test.js - inline asset tests
  "test/inline-asset.test.js:128",
  "test/inline-asset.test.js:151",
  "test/inline-asset.test.js:171",
  "test/inline-asset.test.js:235",
  "test/inline-asset.test.js:281",
  "test/inline-asset.test.js:312",
  "test/inline-asset.test.js:337",
  "test/inline-asset.test.js:360",

  // test/file-utils.test.js - file utility tests
  "test/file-utils.test.js:85",
  "test/file-utils.test.js:222",
  "test/file-utils.test.js:265",

  // test/cache-buster.test.js - environment variable cleanup
  "test/cache-buster.test.js:32",
  "test/cache-buster.test.js:54",
  "test/cache-buster.test.js:76",
  "test/cache-buster.test.js:97",
  "test/cache-buster.test.js:120",
  "test/cache-buster.test.js:147",
]);

// ============================================
// Loose equality (== / !=) exceptions
// ============================================

const ALLOWED_LOOSE_EQUALITY = new Set([
  // src/_lib/media/image.js - null checks
  "src/_lib/media/image.js:101",
  "src/_lib/media/image.js:171",

  // src/categories/categories.11tydata.js - null check
  "src/categories/categories.11tydata.js:8",

  // src/_lib/eleventy/js-config.js - null check
  "src/_lib/eleventy/js-config.js:12",

  // src/_lib/collections/tags.js - null filter
  "src/_lib/collections/tags.js:7",

  // src/_lib/collections/reviews.js - null checks
  "src/_lib/collections/reviews.js:49",
  "src/_lib/collections/reviews.js:60",

  // src/assets/js/tabs.js - length check
  "src/assets/js/tabs.js:18",
]);

// ============================================
// .then() usage exceptions
// ============================================

const ALLOWED_THEN_USAGE = new Set([
  // src/assets/js/availability-calendar.js - fetch chain
  "src/assets/js/availability-calendar.js:133",
]);

export {
  ALLOWED_MUTABLE_VAR_FILES,
  ALLOWED_LET_PATTERNS,
  ALLOWED_TRY_CATCHES,
  ALLOWED_LOOSE_EQUALITY,
  ALLOWED_THEN_USAGE,
};
