/**
 * Centralized code quality exceptions
 *
 * All whitelisted/grandfathered code quality violations are defined here.
 * These should be removed over time as the codebase is refactored.
 */

// ============================================
// let exceptions (specific patterns only - no file-level exceptions)
// ============================================

// Specific let patterns that are intentionally allowed (module-level state)
const ALLOWED_LET_PATTERNS = [
  // Module-level state that must be mutable
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

  // src/assets/js/availability-calendar.js - fetch error handling
  "src/assets/js/availability-calendar.js:132",

  // src/assets/js/cart.js - JSON parsing and fetch handling
  "src/assets/js/cart.js:121",
  "src/assets/js/cart.js:157",
  "src/assets/js/cart.js:426",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:339",

  // src/assets/js/stripe-checkout.js - Stripe API
  "src/assets/js/stripe-checkout.js:38",

  // src/assets/js/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/assets/js/cart-utils.js:11",

  // test/checkout.test.js - checkout flow tests
  "test/checkout.test.js:234",
  "test/checkout.test.js:282",
  "test/checkout.test.js:343",
  "test/checkout.test.js:377",
  "test/checkout.test.js:419",
  "test/checkout.test.js:485",
  "test/checkout.test.js:534",
  "test/checkout.test.js:586",
  "test/checkout.test.js:611",
  "test/checkout.test.js:646",
  "test/checkout.test.js:686",
  "test/checkout.test.js:724",
  "test/checkout.test.js:763",

  // test/file-utils.test.js - file utility tests
  "test/file-utils.test.js:85",
  "test/file-utils.test.js:222",
  "test/file-utils.test.js:265",

  // test/cpd.test.js - running external tool and capturing exit code
  "test/cpd.test.js:16",

  // test/knip.test.js - running external tool and capturing exit code
  "test/knip.test.js:16",
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
  ALLOWED_LET_PATTERNS,
  ALLOWED_TRY_CATCHES,
  ALLOWED_THEN_USAGE,
  ALLOWED_CONSOLE_LOG_FILES,
};
