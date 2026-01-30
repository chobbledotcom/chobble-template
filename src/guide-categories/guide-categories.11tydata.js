import { contentTypeData } from "#utils/content-type-data.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";

export default contentTypeData("guide", {
  eleventyNavigation: (data) => {
    if (data.eleventyNavigation) {
      return withNavigationAnchor(data, data.eleventyNavigation);
    }
    return withNavigationAnchor(data, {
      key: data.title,
      parent: data.strings.guide_name,
      order: data.link_order || 0,
    });
  },
});
