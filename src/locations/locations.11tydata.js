import strings from "#data/strings.js";

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
      if (data.eleventyNavigation) return data.eleventyNavigation;
      if (data.parentLocation) return undefined;
      return {
        key: data.title,
        parent: strings.location_name,
        order: data.link_order || 0,
      };
    },
  },
};
