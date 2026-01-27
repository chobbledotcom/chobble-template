import strings from "#data/strings.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    "guide-category": (data) => normaliseSlug(data["guide-category"]),
    navigationParent: () => strings.guide_name,
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const category = normaliseSlug(data["guide-category"]) || "uncategorized";
      return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
    },
  },
};
