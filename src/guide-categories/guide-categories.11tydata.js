import strings from "#data/strings.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import { buildPermalink } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    navigationParent: () => strings.guide_name,
    permalink: (data) => buildPermalink(data, strings.guide_permalink_dir),
    eleventyNavigation: (data) => {
      if (data.eleventyNavigation) {
        return withNavigationAnchor(data, data.eleventyNavigation);
      }
      return withNavigationAnchor(data, {
        key: data.title,
        parent: strings.guide_name,
        order: data.link_order || 0,
      });
    },
  },
};
