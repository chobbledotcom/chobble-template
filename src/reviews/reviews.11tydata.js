import strings from "#data/strings.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    products: (data) => {
      const products = data.products || [];
      return products.map(normaliseSlug);
    },
  },
};
