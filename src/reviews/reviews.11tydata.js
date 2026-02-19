import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    /** @param {*} data */
    title: (data) => data.title || data.name,
    /** @param {*} data */
    products: (data) => {
      const products = data.products || [];
      return products.map(normaliseSlug);
    },
    // Normalize singular "property:" key into "properties" array for filter compatibility
    /** @param {*} data */
    properties: (data) => {
      if (data.property) {
        return [normaliseSlug(data.property)];
      }
      return [];
    },
  },
};
