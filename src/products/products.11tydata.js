import { computeGallery } from "#collections/products.js";
import strings from "#data/strings.js";
import { computeSpecs } from "#filters/spec-filters.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

function computeCartAttributes(data) {
  if (!data.options || data.options.length === 0) {
    return null;
  }

  const specs = computeSpecs(data);

  return JSON.stringify({
    name: data.title,
    options: data.options.map((opt) => ({
      name: opt.name,
      unit_price: opt.unit_price,
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
    })),
    specs: specs
      ? specs.map((s) => ({ name: s.name, value: s.value }))
      : null,
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
