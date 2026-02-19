import strings from "#data/strings.js";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    keywords: (data) => data.keywords || [],
    navigationParent: () => strings.product_name,
    eleventyNavigation: (data) =>
      buildNavigation(data, (d) => {
        if (d.parent !== null && d.parent !== undefined) return false;
        return withNavigationAnchor(d, {
          key: d.title,
          parent: strings.product_name,
          order: d.link_order || 0,
        });
      }),
  },
};
