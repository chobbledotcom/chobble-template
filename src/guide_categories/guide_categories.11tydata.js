import strings from "#data/strings.js";
import { buildPermalink } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    navigationParent: () => strings.guide_name,
    permalink: (data) => buildPermalink(data, strings.guide_permalink_dir),
    eleventyNavigation: (data) => {
      if (data.eleventyNavigation) return data.eleventyNavigation;
      return {
        key: data.title,
        parent: strings.guide_name,
        order: data.link_order || 0,
      };
    },
  },
};
