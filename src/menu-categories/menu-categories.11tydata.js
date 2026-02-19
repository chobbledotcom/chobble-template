import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    /** @param {*} data */
    title: (data) => data.title || data.name,
    /** @param {*} data */
    menus: (data) => {
      const menus = data.menus || [];
      return menus.map(normaliseSlug);
    },
  },
};
