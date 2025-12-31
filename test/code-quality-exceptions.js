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
]);

// Specific let patterns that are intentionally allowed (module-level state)
const ALLOWED_LET_PATTERNS = [
  // Module-level state that must be mutable
  /^let\s+(ELEMENTS|PREVIOUS_GLOBAL_VARS)\s*=\s*null/, // theme-editor.js state
  /^let\s+(gallery|currentImage|imagePopup)\s*[,;=]/, // gallery.js DOM refs
  /^let\s+currentPopupIndex\s*=/, // gallery.js state
  // Closure state shared between callbacks - let is clearer than const wrapper
  /^let\s+state\s*=/, // mutable state shared between callbacks
];

// ============================================
// try/catch exceptions
// ============================================

const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:289",

  // ecommerce-backend/server.test.js - test assertions
  "ecommerce-backend/server.test.js:370",

  // src/assets/js/cart.js - JSON parsing and fetch handling
  "src/assets/js/cart.js:121",
  "src/assets/js/cart.js:157",
  "src/assets/js/cart.js:426",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:339",

  // src/assets/js/stripe-checkout.js - Stripe API
  "src/assets/js/stripe-checkout.js:38",

  // test/scss.test.js - SCSS compilation tests
  "test/scss.test.js:42",
  "test/scss.test.js:208",

  // test/navigation.test.js - navigation tests
  "test/navigation.test.js:80",

  // src/assets/js/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/assets/js/cart-utils.js:11",

  // test/checkout.test.js - checkout flow tests
  "test/checkout.test.js:235",
  "test/checkout.test.js:283",
  "test/checkout.test.js:344",
  "test/checkout.test.js:378",
  "test/checkout.test.js:420",
  "test/checkout.test.js:486",
  "test/checkout.test.js:535",
  "test/checkout.test.js:587",
  "test/checkout.test.js:612",
  "test/checkout.test.js:647",
  "test/checkout.test.js:687",
  "test/checkout.test.js:725",
  "test/checkout.test.js:764",

  // test/file-utils.test.js - file utility tests
  "test/file-utils.test.js:85",
  "test/file-utils.test.js:222",
  "test/file-utils.test.js:265",

  // test/cpd.test.js - running external tool and capturing exit code
  "test/cpd.test.js:12",

  // test/knip.test.js - running external tool and capturing exit code
  "test/knip.test.js:12",
]);

// ============================================
// .then() usage exceptions
// ============================================

const ALLOWED_THEN_USAGE = new Set([
  // src/assets/js/availability-calendar.js - fetch chain
  "src/assets/js/availability-calendar.js:133",
]);

// ============================================
// console.log exceptions
// ============================================

// Files allowed to use console.log (CLI scripts, tools, etc.)
// Production code should use console.error for user-facing error messages
const ALLOWED_CONSOLE_LOG_FILES = new Set([
  "src/_lib/scripts/add-skus.js", // CLI script - needs stdout output
  "src/_lib/media/unused-images.js", // CLI script - reports unused images
  "src/_lib/eleventy/pdf.js", // Build-time logging
  "ecommerce-backend/server.js", // Server startup messages
  "bin/profile", // CLI profiling tool
]);

export {
  ALLOWED_MUTABLE_VAR_FILES,
  ALLOWED_LET_PATTERNS,
  ALLOWED_TRY_CATCHES,
  ALLOWED_THEN_USAGE,
  ALLOWED_CONSOLE_LOG_FILES,
};
