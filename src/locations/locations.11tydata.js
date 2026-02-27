import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";
import { normalisePermalink } from "#utils/slug-utils.js";

export default linkableContent("location", {
  parentLocation: (data) => {
    const regex = new RegExp(
      `/${strings.location_permalink_dir}/([^/]+)/[^/]+\\.md$`,
    );
    const match = data.page.inputPath.match(regex);
    return match ? match[1] : null;
  },
  permalink: (data) => {
    if (data.permalink) return normalisePermalink(data.permalink);
    if (data.parentLocation) {
      return `/${strings.location_permalink_dir}/${data.parentLocation}/${data.page.fileSlug}/`;
    }
    return `/${strings.location_permalink_dir}/${data.page.fileSlug}/`;
  },
  eleventyNavigation: (data) =>
    buildNavigation(data, (d) => {
      if (d.parentLocation) {
        return withNavigationAnchor(d, {
          key: d.page.fileSlug,
          title: d.title,
          parent: d.parentLocation,
          order: d.link_order || 0,
        });
      }
      return withNavigationAnchor(d, {
        key: d.page.fileSlug,
        title: d.title,
        parent: strings.location_name,
        order: d.link_order || 0,
      });
    }),
});
