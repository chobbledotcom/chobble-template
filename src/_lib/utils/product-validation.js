/**
 * Product validation utilities
 *
 * Validation functions for product data, separated to reduce complexity
 * in products.11tydata.js and enable proper unit testing.
 */
import { findDuplicate } from "#utils/array-utils.js";

/**
 * Validate hire mode options have required fields.
 * @param {Array} options - The options to validate
 * @param {string} title - The product title for error messages
 * @throws {Error} If options have duplicate days or missing 1-day option
 */
export const validateHireOptions = (options, title) => {
  const duplicate = findDuplicate(options, (opt) => opt.days);
  if (duplicate) {
    throw new Error(
      `Product "${title}" has duplicate options for days=${duplicate.days}`,
    );
  }
  if (!options.some((opt) => opt.days === 1)) {
    throw new Error(`Product "${title}" is hire mode but has no 1-day option`);
  }
};
