/**
 * Product cart data utilities
 *
 * Functions for computing product options and cart attributes,
 * extracted from products.11tydata.js for testability and reuse.
 */
import {
  filterMap,
  findDuplicate,
  pick,
  pipe,
  sortBy,
} from "#utils/array-utils.js";
import { toObject } from "#utils/object-entries.js";

/** @typedef {import("#lib/types").ProductOption} ProductOption */
/** @typedef {import("#lib/types").ProductSpec} ProductSpec */
/** @typedef {import("#lib/types").ProductData} ProductData */
/** @typedef {import("#lib/types").CartAttributesParams} CartAttributesParams */

/**
 * Parse a price string or number to a number
 * @param {string | number} priceStr - Price string like "£10.00" or number like 1000
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
 * Validate hire options for cart use
 * @param {ProductOption[]} options - Hire options to validate
 * @param {string} title - Product title for error messages
 * @returns {void}
 * @throws {Error} If validation fails
 */
const validateHireOptions = (options, title) => {
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

/**
 * Compute processed options for a product
 * @param {ProductData} data - Product data
 * @param {string} mode - Product mode ("hire", "buy", etc.)
 * @returns {ProductOption[]} Processed options
 */
export const computeOptions = (data, mode) => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  if (mode !== "hire") {
    return data.options;
  }

  return pipe(
    filterMap(
      (opt) => opt.days != null,
      (opt) => ({
        ...opt,
        unit_price: parsePrice(
          opt.unit_price,
          `${data.title} days=${opt.days}`,
        ),
      }),
    ),
    sortBy("days"),
  )(data.options);
};

/**
 * Build cart attributes JSON for a product
 * @param {CartAttributesParams} params - Parameters
 * @returns {string | null} HTML-escaped JSON string for data attribute, or null if no options
 */
export const buildCartAttributes = ({
  title,
  subtitle,
  options,
  specs,
  mode,
}) => {
  if (options.length === 0) return null;

  if (mode === "hire") validateHireOptions(options, title);

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
