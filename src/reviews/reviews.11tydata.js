import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    products: (data) => {
      const products = data.products || [];
      return products.map(normaliseSlug);
    },
    // Normalize singular "property:" key into "properties" array for filter compatibility
    properties: (data) => {
      if (data.property) {
        return [normaliseSlug(data.property)];
      }
      return [];
    },
  },
};
