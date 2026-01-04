import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import strings from "#data/strings.js";
import { computeSpecs } from "#filters/spec-filters.js";
import { pick } from "#utils/array-utils.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

const parsePrice = (priceStr, context) => {
  const match = String(priceStr).match(/[\d.]+/);
  if (!match) {
    throw new Error(`Cannot parse price "${priceStr}" in ${context}`);
  }
  return Number.parseFloat(match[0]);
};

const getProductMode = (data) => {
  const config = getConfig();
  return data.product_mode || config.product_mode;
};

const validateHireOptions = (options, title) => {
  const seenDays = new Set();
  for (const opt of options) {
    if (seenDays.has(opt.days)) {
      throw new Error(
        `Product "${title}" has duplicate options for days=${opt.days}`,
      );
    }
    seenDays.add(opt.days);
  }
  if (!seenDays.has(1)) {
    throw new Error(`Product "${title}" is hire mode but has no 1-day option`);
  }
};

const computeOptions = (data) => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  const mode = getProductMode(data);
  if (mode !== "hire") {
    return data.options;
  }

  return data.options
    .filter((opt) => opt.days != null)
    .map((opt) => ({
      ...opt,
      unit_price: parsePrice(opt.unit_price, `${data.title} days=${opt.days}`),
    }))
    .sort((a, b) => a.days - b.days);
};

const computeCartAttributes = (data) => {
  const options = computeOptions(data);
  if (options.length === 0) {
    return null;
  }

  const mode = getProductMode(data);
  const specs = computeSpecs(data);

  if (mode === "hire") {
    validateHireOptions(options, data.title);
  }

  const hirePrices =
    mode === "hire"
      ? Object.fromEntries(options.map((opt) => [opt.days, opt.unit_price]))
      : {};

  return JSON.stringify({
    name: data.title,
    options: options.map((opt) => ({
      name: opt.name,
      unit_price:
        mode === "hire"
          ? opt.unit_price
          : parsePrice(opt.unit_price, `${data.title} option "${opt.name}"`),
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
      days: opt.days || null,
    })),
    specs: specs ? specs.map(pick(["name", "value"])) : null,
    hire_prices: hirePrices,
    product_mode: mode,
  }).replace(/"/g, "&quot;");
};

export default {
  eleventyComputed: {
    categories: (data) => (data.categories || []).map(normaliseSlug),
    gallery: computeGallery,
    navigationParent: () => strings.product_name,
    options: computeOptions,
    permalink: (data) => buildPermalink(data, strings.product_permalink_dir),
    specs: computeSpecs,
    cart_attributes: computeCartAttributes,
  },
};
