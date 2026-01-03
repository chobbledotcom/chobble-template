import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import strings from "#data/strings.js";
import { computeSpecs } from "#filters/spec-filters.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

// Extract hire prices from options with days values
// Returns object like { 1: "£30", 2: "£45", ... }
const extractHirePrices = (options) => {
  if (!options || options.length === 0) {
    return {};
  }

  const formatPrice = (opt) =>
    typeof opt.unit_price === "number" ? `£${opt.unit_price}` : opt.unit_price;

  return Object.fromEntries(
    options
      .filter((opt) => opt.days != null)
      .map((opt) => [opt.days, formatPrice(opt)]),
  );
};

// Validate that no two options have the same days value
// Throws an error if duplicates are found
const validateNoDuplicateDays = (options, productTitle) => {
  if (!options || options.length === 0) {
    return;
  }

  const daysOptions = options.filter((opt) => opt.days != null);
  const seenDays = new Set();

  for (const opt of daysOptions) {
    if (seenDays.has(opt.days)) {
      throw new Error(
        `Product "${productTitle}" has multiple options with days=${opt.days}. Each days value must be unique.`,
      );
    }
    seenDays.add(opt.days);
  }
};

function computeCartAttributes(data) {
  if (!data.options || data.options.length === 0) {
    return null;
  }

  const config = getConfig();
  const specs = computeSpecs(data);
  const effectiveProductMode = data.product_mode || config.product_mode || null;

  // Validate no duplicate days values
  validateNoDuplicateDays(data.options, data.title);

  // Extract hire prices from options with days values
  const hirePrices = extractHirePrices(data.options);

  return JSON.stringify({
    name: data.title,
    options: data.options.map((opt) => ({
      name: opt.name,
      unit_price: opt.unit_price,
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
      days: opt.days || null,
    })),
    specs: specs ? specs.map((s) => ({ name: s.name, value: s.value })) : null,
    hire_prices: hirePrices,
    product_mode: effectiveProductMode,
  }).replace(/"/g, "&quot;");
}

export default {
  eleventyComputed: {
    categories: (data) => (data.categories || []).map(normaliseSlug),
    gallery: computeGallery,
    navigationParent: () => strings.product_name,
    permalink: (data) => buildPermalink(data, strings.product_permalink_dir),
    specs: computeSpecs,
    cart_attributes: computeCartAttributes,
  },
};
