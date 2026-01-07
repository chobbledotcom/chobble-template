/**
 * Example: Adding types to your existing code
 *
 * This file demonstrates three approaches to type checking:
 * 1. JSDoc annotations
 * 2. Importing types from .d.ts files
 * 3. Inline type definitions
 */

import { filter, map, pipe } from "#utils/array-utils.js";

// ==============================================================================
// Approach 1: JSDoc Annotations (Basic)
// ==============================================================================

/**
 * Calculate discount price
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage (0-100)
 * @returns {number} Discounted price
 */
const calculateDiscount = (price, discount) => {
  return price * (1 - discount / 100);
};

// ==============================================================================
// Approach 2: Type Definitions with @typedef
// ==============================================================================

/**
 * @typedef {Object} Product
 * @property {string} title - Product name
 * @property {number} price - Price in cents
 * @property {string[]} [categories] - Optional category slugs
 * @property {boolean} [featured] - Whether product is featured
 */

/**
 * Get featured products
 * @param {Product[]} products - Array of products
 * @returns {Product[]} Only featured products
 */
const getFeatured = (products) => {
  return products.filter((p) => p.featured === true);
};

// ==============================================================================
// Approach 3: Curried Functions with Generics
// ==============================================================================

/**
 * Filter products by category (curried)
 * @template T
 * @param {string} categorySlug - Category to filter by
 * @returns {(products: T[]) => T[]} Function that filters products
 */
const filterByCategory = (categorySlug) => (products) => {
  return products.filter((p) => p.categories?.includes(categorySlug));
};

// ==============================================================================
// Approach 4: Using Imported Types from .d.ts Files
// ==============================================================================

/**
 * @typedef {import('#lib/types/eleventy.js').EleventyConfig} EleventyConfig
 * @typedef {import('#lib/types/eleventy.js').CollectionItem} CollectionItem
 */

/**
 * Example Eleventy configuration function
 * @param {EleventyConfig} eleventyConfig
 */
const configureExample = (eleventyConfig) => {
  // TypeScript now knows all methods on eleventyConfig
  eleventyConfig.addCollection("example", (collectionApi) => {
    // And knows about collectionApi methods too!
    return collectionApi.getFilteredByTag("example");
  });

  eleventyConfig.addFilter("exampleFilter", (items) => {
    return items.slice(0, 10);
  });
};

// ==============================================================================
// Approach 5: Complex Types with Union Types
// ==============================================================================

/**
 * @typedef {'stripe' | 'paypal' | 'quote'} PaymentMethod
 */

/**
 * @typedef {Object} CartItem
 * @property {string} sku
 * @property {number} quantity
 * @property {number} price
 */

/**
 * Calculate cart total
 * @param {CartItem[]} items - Items in cart
 * @param {PaymentMethod} method - Payment method
 * @returns {number} Total price
 */
const calculateTotal = (items, method) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Add processing fee for certain payment methods
  const fee = method === "paypal" ? subtotal * 0.029 : 0;

  return subtotal + fee;
};

// ==============================================================================
// Approach 6: Using Functional Utilities with Types
// ==============================================================================

/**
 * @typedef {Object} Event
 * @property {string} title
 * @property {Date} date
 * @property {string} location
 */

/**
 * Get upcoming events at a specific location
 * @param {Event[]} events
 * @param {string} locationSlug
 * @returns {Event[]}
 */
const getUpcomingEventsAt = (events, locationSlug) => {
  const now = new Date();

  return pipe(
    filter((event) => event.date > now),
    filter((event) => event.location === locationSlug),
    map((event) => ({
      ...event,
      daysUntil: Math.ceil((event.date - now) / (1000 * 60 * 60 * 24)),
    }))
  )(events);
};

// ==============================================================================
// Approach 7: Optional Parameters and Default Values
// ==============================================================================

/**
 * Paginate items
 * @param {any[]} items - Items to paginate
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [perPage=10] - Items per page
 * @returns {{items: any[], total: number, page: number, pages: number}}
 */
const paginate = (items, page = 1, perPage = 10) => {
  const total = items.length;
  const pages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    items: items.slice(start, end),
    total,
    page,
    pages,
  };
};

// ==============================================================================
// Approach 8: Rest Parameters and Spread Types
// ==============================================================================

/**
 * Merge multiple objects
 * @template T
 * @param {...T} objects - Objects to merge
 * @returns {T} Merged object
 */
const merge = (...objects) => {
  return Object.assign({}, ...objects);
};

// ==============================================================================
// How to Test Type Checking
// ==============================================================================

// Run: bun run typecheck
// Or:  bun tsc --noEmit

// These will cause type errors:
// calculateDiscount("100", 10);          // Error: price must be number
// getFeatured("not an array");           // Error: expects array
// calculateTotal([], "bitcoin");         // Error: invalid payment method

export {
  calculateDiscount,
  getFeatured,
  filterByCategory,
  configureExample,
  calculateTotal,
  getUpcomingEventsAt,
  paginate,
  merge,
};
