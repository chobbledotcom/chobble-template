import strings from "#data/strings.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import { slugToTitle } from "#utils/slug-utils.js";

const locationDir = strings.location_permalink_dir;

export default {
  eleventyComputed: {
    navigationParent: () => strings.location_name,
    parentLocation: (data) => {
      const regex = new RegExp(`/${locationDir}/([^/]+)/[^/]+\\.md$`);
      const match = data.page.inputPath.match(regex);
      return match ? match[1] : null;
    },
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const parent = data.parentLocation;
      if (parent) {
        return `/${locationDir}/${parent}/${data.page.fileSlug}/`;
      }
      return `/${locationDir}/${data.page.fileSlug}/`;
    },
    eleventyNavigation: (data) => {
      if (data.eleventyNavigation) {
        return withNavigationAnchor(data, data.eleventyNavigation);
      }
      if (data.parentLocation) {
        // Service-location: add as child of parent location
        return withNavigationAnchor(data, {
          key: data.title,
          parent: slugToTitle(data.parentLocation),
          order: data.link_order || 0,
        });
      }
      return withNavigationAnchor(data, {
        key: data.title,
        parent: strings.location_name,
        order: data.link_order || 0,
      });
    },
  },
};
