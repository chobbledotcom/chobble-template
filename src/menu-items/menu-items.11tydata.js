import { pick } from "#toolkit/fp/array.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    title: (data) => data.title || data.name,
    dietaryKeys: (data) => {
      const dietaryIndicators = data.dietaryIndicators || {};

      return Object.values(dietaryIndicators)
        .filter((indicator) => data[indicator.field])
        .map(pick(["symbol", "label"]));
    },
    menu_categories: (data) => {
      const categories = data.menu_categories || [];
      return categories.map(normaliseSlug);
    },
  },
};
