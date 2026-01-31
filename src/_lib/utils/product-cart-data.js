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
 * Try to extract a number from a price value. Returns null if unparseable.
 * @param {string | number} value
 * @returns {number | null}
 */
const extractNumericPrice = (value) => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const match = String(value).match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : null;
};

/**
 * Parse a price, throwing on failure (for hire mode where prices are required).
 * @param {string | number} priceStr
 * @param {string} context
 * @returns {number}
 */
const parsePriceStrict = (priceStr, context) => {
  const result = extractNumericPrice(priceStr);
  if (result === null) {
    throw new Error(`Cannot parse price "${priceStr}" in ${context}`);
  }
  return result;
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
 * Apply default max_quantity to an option if not set
 * @param {ProductOption} opt - Option to process
 * @param {number | null} defaultMaxQuantity - Default max quantity from config
 * @returns {ProductOption} Option with max_quantity applied
 */
const applyDefaultMaxQuantity = (opt, defaultMaxQuantity) => {
  if (opt.max_quantity != null) return opt;
  if (defaultMaxQuantity != null)
    return { ...opt, max_quantity: defaultMaxQuantity };
  return { ...opt, max_quantity: null };
};

/**
 * Compute processed options for a product.
 * Each option gets a numeric_price (number or null).
 * @param {ProductData} data - Product data
 * @param {string} mode - Product mode ("hire", "buy", etc.)
 * @param {number | null} defaultMaxQuantity - Default max quantity from config
 * @returns {ProductOption[]} Processed options
 */
export const computeOptions = (data, mode, defaultMaxQuantity = null) => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  /** Normalize nullable fields so downstream serialization never needs || null */
  const normalizeNullable = (opt) => ({
    ...opt,
    sku: opt.sku != null ? opt.sku : null,
    days: opt.days != null ? opt.days : null,
  });

  if (mode !== "hire") {
    return data.options.map((opt) => {
      const normalized = normalizeNullable(
        applyDefaultMaxQuantity(opt, defaultMaxQuantity),
      );
      return {
        ...normalized,
        numeric_price: extractNumericPrice(opt.unit_price),
      };
    });
  }

  return pipe(
    filterMap(
      (opt) => opt.days != null,
      (opt) => {
        const numericPrice = parsePriceStrict(
          opt.unit_price,
          `${data.title} days=${opt.days}`,
        );
        return normalizeNullable({
          ...applyDefaultMaxQuantity(opt, defaultMaxQuantity),
          unit_price: numericPrice,
          numeric_price: numericPrice,
        });
      },
    ),
    sortBy("days"),
  )(data.options);
};

/**
 * Build cart attributes JSON for a product.
 * Returns null if no options have a parseable price.
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

  const pricedOptions = options.filter((opt) => opt.numeric_price != null);
  if (pricedOptions.length === 0) return null;

  if (mode === "hire") validateHireOptions(pricedOptions, title);

  return JSON.stringify({
    name: title,
    subtitle,
    options: pricedOptions.map((opt) => ({
      name: opt.name,
      unit_price: opt.numeric_price,
      max_quantity: opt.max_quantity,
      sku: opt.sku,
      days: opt.days,
    })),
    specs: specs ? specs.map(pick(["name", "value"])) : null,
    hire_prices:
      mode === "hire"
        ? toObject(pricedOptions, (opt) => [opt.days, opt.numeric_price])
        : {},
    product_mode: mode,
  }).replace(/"/g, "&quot;");
};
