import { pick } from "#toolkit/fp/array.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    /** @param {*} data */
    title: (data) => data.title || data.name,
    /** @param {*} data */
    dietaryKeys: (data) => {
      const dietaryIndicators = data.dietaryIndicators || {};

      return Object.values(dietaryIndicators)
        .filter((indicator) => data[indicator.field])
        .map(pick(["symbol", "label"]));
    },
    /** @param {*} data */
    menu_categories: (data) => {
      const categories = data.menu_categories || [];
      return categories.map(normaliseSlug);
    },
  },
};
