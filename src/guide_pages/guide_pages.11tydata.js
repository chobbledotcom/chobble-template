import strings from "../_data/strings.js";
import { buildGuidePagePermalink, normaliseSlug } from "../_lib/slug-utils.js";

export default {
  eleventyComputed: {
    guide_category: (data) => normaliseSlug(data.guide_category),
    navigationParent: () => strings.guide_name,
    permalink: (data) =>
      buildGuidePagePermalink(data, strings.guide_permalink_dir),
  },
};
