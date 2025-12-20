import { computeGallery } from "#collections/products.js";
import strings from "#data/strings.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    locations: (data) => (data.locations || []).map(normaliseSlug),
    gallery: computeGallery,
    navigationParent: () => strings.property_name,
    permalink: (data) => buildPermalink(data, strings.property_permalink_dir),
  },
};
