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
      if (data.parentLocation) {
        // Service-location: add as child of parent location
        // Convert slug to title case for the parent navigation key
        // e.g., "royston-vasey" → "Royston Vasey"
        const parentTitle = data.parentLocation
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return {
          key: data.title,
          parent: parentTitle,
          order: data.link_order || 0,
        };
      }
      return {
        key: data.title,
        parent: strings.location_name,
        order: data.link_order || 0,
      };
    },
  },
};
