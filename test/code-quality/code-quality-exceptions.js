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

  // ecommerce-backend/server.test.js - test assertions
  "ecommerce-backend/server.test.js:366",

  // src/assets/js/availability-calendar.js - fetch error handling
  "src/assets/js/availability-calendar.js:132",

  // src/assets/js/cart.js - PayPal checkout fetch handling
  "src/assets/js/cart.js:224",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:337",

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
  "test/file-utils.test.js:84",
  "test/file-utils.test.js:221",
  "test/file-utils.test.js:264",

  // test/cpd.test.js - running external tool and capturing exit code
  "test/cpd.test.js:16",

  // test/knip.test.js - running external tool and capturing exit code
  "test/knip.test.js:16",
]);

export { ALLOWED_TRY_CATCHES };
