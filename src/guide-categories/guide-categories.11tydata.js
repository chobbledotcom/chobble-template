import { linkableContent } from "#utils/linkable-content.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("guide", {
  property: (data) =>
    data.property ? normaliseSlug(data.property) : undefined,
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
