import strings from "../_data/strings.js";
import { normaliseSlug } from "../_lib/slug-utils.js";

const buildPermalink = (data) => {
  if (data.permalink) return data.permalink;
  const category = normaliseSlug(data.guide_category) || "uncategorized";
  return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
};

export default {
  eleventyComputed: {
    guide_category: (data) => normaliseSlug(data.guide_category),
    navigationParent: () => strings.guide_name,
    permalink: buildPermalink,
  },
};
