/**
 * Product cart data utilities
 *
 * Functions for computing product options and cart attributes,
 * extracted from products.11tydata.js for testability and reuse.
 */
import { findDuplicate, pick } from "#utils/array-utils.js";
import { toObject } from "#utils/object-entries.js";

/**
 * Parse a price string to a number
 * @param {string} priceStr - Price string like "£10.00" or "10"
 * @param {string} context - Context for error messages
 * @returns {number} Parsed price
 */
const parsePrice = (priceStr, context) => {
  const match = String(priceStr).match(/[\d.]+/);
  if (!match) {
    throw new Error(`Cannot parse price "${priceStr}" in ${context}`);
  }
  return Number.parseFloat(match[0]);
};

/**
 * Compute processed options for a product
 * @param {Object} data - Product data
 * @param {string} mode - Product mode ("hire", "buy", etc.)
 * @returns {Array} Processed options
 */
export const computeOptions = (data, mode) => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  if (mode !== "hire") {
    return data.options;
  }

  const hireOptions = data.options
    .filter((opt) => opt.days != null)
    .map((opt) => ({
      ...opt,
      unit_price: parsePrice(opt.unit_price, `${data.title} days=${opt.days}`),
    }))
    .sort((a, b) => a.days - b.days);

  // Validate hire options
  const duplicate = findDuplicate(hireOptions, (opt) => opt.days);
  if (duplicate) {
    throw new Error(
      `Product "${data.title}" has duplicate options for days=${duplicate.days}`,
    );
  }
  if (!hireOptions.some((opt) => opt.days === 1)) {
    throw new Error(
      `Product "${data.title}" is hire mode but has no 1-day option`,
    );
  }

  return hireOptions;
};

/**
 * Build cart attributes JSON for a product
 * @param {Object} params - Parameters
 * @param {string} params.title - Product title
 * @param {string} params.subtitle - Product subtitle
 * @param {Array} params.options - Processed options (already validated if hire)
 * @param {Array} params.specs - Product specifications
 * @param {string} params.mode - Product mode
 * @returns {string} HTML-escaped JSON string for data attribute
 */
export const buildCartAttributes = ({
  title,
  subtitle,
  options,
  specs,
  mode,
}) => {
  if (options.length === 0) return null;

  return JSON.stringify({
    name: title,
    subtitle,
    options: options.map((opt) => ({
      name: opt.name,
      unit_price:
        mode === "hire"
          ? opt.unit_price
          : parsePrice(opt.unit_price, `${title} option "${opt.name}"`),
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
      days: opt.days || null,
    })),
    specs: specs ? specs.map(pick(["name", "value"])) : null,
    hire_prices:
      mode === "hire"
        ? toObject(options, (opt) => [opt.days, opt.unit_price])
        : {},
    product_mode: mode,
  }).replace(/"/g, "&quot;");
};
