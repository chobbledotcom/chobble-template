import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";
import { normalisePermalink, normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("guide", {
  "guide-category": (data) => normaliseSlug(data["guide-category"]),
  parentGuideCategory: (data) => normaliseSlug(data["guide-category"]),
  permalink: (data) => {
    if (data.permalink) return normalisePermalink(data.permalink);
    const category = normaliseSlug(data["guide-category"]) || "uncategorized";
    return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
  },
});
