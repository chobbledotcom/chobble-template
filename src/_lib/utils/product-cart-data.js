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
} from "#toolkit/fp/array.js";
import { toObject } from "#toolkit/fp/object.js";

/** @typedef {import("#lib/types").ProductOption} ProductOption */
/** @typedef {import("#lib/types").ProductSpec} ProductSpec */
/** @typedef {import("#lib/types").ProductData} ProductData */
/** @typedef {import("#lib/types").CartAttributesParams} CartAttributesParams */

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
 * Normalize an option: apply default max_quantity, ensure nullable fields are explicit.
 * @param {ProductOption} opt
 * @param {number | null} defaultMaxQuantity
 * @returns {ProductOption}
 */
const normalizeOption = (opt, defaultMaxQuantity) => ({
  ...opt,
  sku: opt.sku != null ? opt.sku : null,
  days: opt.days != null ? opt.days : null,
  max_quantity:
    opt.max_quantity != null
      ? opt.max_quantity
      : defaultMaxQuantity != null
        ? defaultMaxQuantity
        : null,
});

/**
 * Compute processed options for a product.
 * @param {ProductData} data - Product data
 * @param {string} mode - Product mode ("hire", "buy", etc.)
 * @param {number | null} defaultMaxQuantity - Default max quantity from config
 * @returns {ProductOption[]} Processed options
 */
export const computeOptions = (data, mode, defaultMaxQuantity = null) => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  if (mode !== "hire") {
    return data.options.map((opt) => normalizeOption(opt, defaultMaxQuantity));
  }

  return pipe(
    filterMap(
      (opt) => opt.days != null,
      (opt) => normalizeOption(opt, defaultMaxQuantity),
    ),
    sortBy("days"),
  )(data.options);
};

/**
 * Build cart attributes JSON for a product.
 * @param {CartAttributesParams} params - Parameters
 * @returns {string | null} HTML-escaped JSON string for data attribute, or null
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
      unit_price: opt.unit_price,
      max_quantity: opt.max_quantity,
      sku: opt.sku,
      days: opt.days,
    })),
    specs: specs ? specs.map(pick(["name", "value"])) : null,
    hire_prices:
      mode === "hire"
        ? toObject(options, (opt) => [opt.days, opt.unit_price])
        : {},
    product_mode: mode,
  }).replace(/"/g, "&quot;");
};
