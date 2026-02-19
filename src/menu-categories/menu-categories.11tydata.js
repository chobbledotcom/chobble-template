import { normaliseSlug } from "#utils/slug-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    title: (data) => data.title || data.name,
    menus: (data) => {
      const menus = data.menus || [];
      return menus.map(normaliseSlug);
    },
  },
};
