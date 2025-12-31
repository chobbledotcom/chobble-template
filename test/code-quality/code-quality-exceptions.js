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

  // test/cpd.test.js - running external tool and capturing exit code
  "test/cpd.test.js:16",

  // test/knip.test.js - running external tool and capturing exit code
  "test/knip.test.js:16",
]);

// ============================================
// HTML in JavaScript exceptions
// ============================================

// Files that are allowed to contain HTML in JavaScript template literals.
// These should be refactored over time to use external templates.
const ALLOWED_HTML_IN_JS = new Set([
  // Client-side JS - cart/checkout rendering
  "src/assets/js/cart.js",
  "src/assets/js/cart-utils.js",
  "src/assets/js/quote.js",
  "src/assets/js/quote-checkout.js",

  // Client-side JS - gallery with SVG icons
  "src/assets/js/gallery.js",

  // Client-side JS - calendar display
  "src/assets/js/availability-calendar.js",

  // Server-side Eleventy plugins generating HTML
  "src/_lib/eleventy/area-list.js",
  "src/_lib/eleventy/opening-times.js",
  "src/_lib/eleventy/recurring-events.js",
  "src/_lib/eleventy/js-config.js",
  "src/_lib/eleventy/responsive-tables.js",

  // Media utilities with HTML generation
  "src/_lib/media/image.js",

  // Collections with embedded HTML/SVG
  "src/_lib/collections/reviews.js",

  // Filters with HTML formatting
  "src/_lib/filters/item-filters.js",
]);

export { ALLOWED_TRY_CATCHES, ALLOWED_HTML_IN_JS };
