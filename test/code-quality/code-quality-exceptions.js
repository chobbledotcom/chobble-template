/**
 * Centralized code quality exceptions
 *
 * All whitelisted/grandfathered code quality violations are defined here.
 * These should be removed over time as the codebase is refactored.
 */

// ============================================
// try/catch exceptions
// ============================================

const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:289",

  // ecommerce-backend/server.test.js - test runner catching failures
  "ecommerce-backend/server.test.js:366",

  // src/assets/js/availability-calendar.js - fetch error handling
  "src/assets/js/availability-calendar.js:132",

  // src/assets/js/cart.js - PayPal checkout fetch handling
  "src/assets/js/cart.js:207",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:337",

  // src/assets/js/stripe-checkout.js - Stripe API
  "src/assets/js/stripe-checkout.js:38",

  // src/assets/js/cart-utils.js - JSON parsing of localStorage data
  // Needed: localStorage is browser-side storage that can be corrupted by users,
  // extensions, or data migration issues. We don't control this input.
  "src/assets/js/cart-utils.js:11",

  // test/cpd.test.js - running external tool and capturing exit code
  "test/cpd.test.js:16",

  // test/knip.test.js - running external tool and capturing exit code
  "test/knip.test.js:16",
]);

export { ALLOWED_TRY_CATCHES };
