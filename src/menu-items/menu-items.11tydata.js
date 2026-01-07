import { pick } from "#utils/array-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    dietaryKeys: (data) => {
      const dietaryIndicators = data.dietaryIndicators || {};

      return (
        Object.values(dietaryIndicators)
          .filter((indicator) => data[indicator.field])
          .map(pick(["symbol", "label"]))
      );
    },
    menu_categories: (data) => {
      const categories = data.menu_categories || [];
      return categories.map(normaliseSlug);
    },
  },
};
