import strings from "#data/strings.js";
import { contentTypeData } from "#utils/content-type-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default contentTypeData("guide", {
  "guide-category": (data) => normaliseSlug(data["guide-category"]),
  permalink: (data) => {
    if (data.permalink) return data.permalink;
    const category = normaliseSlug(data["guide-category"]) || "uncategorized";
    return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
  },
});
