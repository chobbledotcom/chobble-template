import { linkableContent } from "#utils/linkable-content.js";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("guide", {
  property: (data) =>
    data.property ? normaliseSlug(data.property) : undefined,
  eleventyNavigation: (data) =>
    buildNavigation(data, (d) => {
      // A category tied to one property belongs in that property's guide,
      // reached from the property page, not in the site-wide navigation.
      if (d.property) return false;
      return withNavigationAnchor(d, {
        key: d.name,
        parent: d.strings.guide_name,
        order: d.link_order || 0,
      });
    }),
});
