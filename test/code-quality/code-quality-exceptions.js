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

  // src/assets/js/cart.js - PayPal checkout fetch handling
  "src/assets/js/cart.js:209",

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
  "src/_lib/eleventy/area-list.js",
  "src/_lib/eleventy/opening-times.js",
  "src/_lib/eleventy/recurring-events.js",
  "src/_lib/eleventy/js-config.js",
  "src/_lib/eleventy/responsive-tables.js",

  // Collections with embedded HTML/SVG
  "src/_lib/collections/reviews.js",

  // Filters with HTML formatting
  "src/_lib/filters/item-filters.js",
]);

export { ALLOWED_TRY_CATCHES, ALLOWED_HTML_IN_JS };
