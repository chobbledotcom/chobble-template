import { computeGallery } from "#collections/products.js";
import strings from "#data/strings.js";
import { computeSpecs } from "#filters/spec-filters.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    categories: (data) => (data.categories || []).map(normaliseSlug),
    gallery: computeGallery,
    navigationParent: () => strings.product_name,
    permalink: (data) => buildPermalink(data, strings.product_permalink_dir),
    specs: computeSpecs,
  },
};
