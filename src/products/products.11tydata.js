import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import strings from "#data/strings.js";
import { computeSpecs } from "#filters/spec-filters.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

function computeCartAttributes(data) {
  if (!data.options || data.options.length === 0) {
    return null;
  }

  const config = getConfig();
  const specs = computeSpecs(data);
  const effectiveProductMode = data.product_mode || config.product_mode || null;

  const hirePrices = {
    1: data.price || null,
    2: data.price_2_days || null,
    3: data.price_3_days || null,
    4: data.price_4_days || null,
    5: data.price_5_days || null,
  };

  return JSON.stringify({
    name: data.title,
    options: data.options.map((opt) => ({
      name: opt.name,
      unit_price: opt.unit_price,
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
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
