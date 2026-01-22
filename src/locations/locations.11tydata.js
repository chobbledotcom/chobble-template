import strings from "#data/strings.js";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";

export default {
  eleventyComputed: {
    navigationParent: () => strings.location_name,
    parentLocation: (data) => {
      const regex = new RegExp(
        `/${strings.location_permalink_dir}/([^/]+)/[^/]+\\.md$`,
      );
      const match = data.page.inputPath.match(regex);
      return match ? match[1] : null;
    },
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      if (data.parentLocation) {
        return `/${strings.location_permalink_dir}/${data.parentLocation}/${data.page.fileSlug}/`;
      }
      return `/${strings.location_permalink_dir}/${data.page.fileSlug}/`;
    },
    eleventyNavigation: (data) =>
      buildNavigation(data, (d) => {
        // Use fileSlug as key for reliable parent-child matching
        // (collections aren't available during data computation)
        // Title is used for display, key is used for matching
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
  },
};
