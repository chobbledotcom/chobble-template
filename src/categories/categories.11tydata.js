import strings from "#data/strings.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";

export default {
  eleventyComputed: {
    navigationParent: () => strings.product_name,
    eleventyNavigation: (data) => {
      if (data.eleventyNavigation) {
        return withNavigationAnchor(data, data.eleventyNavigation);
      }
      if (data.parent !== null && data.parent !== undefined) return false;
      return withNavigationAnchor(data, {
        key: data.title,
        parent: strings.product_name,
        order: data.link_order || 0,
      });
    },
  },
};
