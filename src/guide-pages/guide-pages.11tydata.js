import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";
import { normalisePermalink, normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("guide", {
  "guide-category": (data) =>
    data["guide-category"] ? normaliseSlug(data["guide-category"]) : undefined,
  parentGuideCategory: (data) =>
    data["guide-category"] ? normaliseSlug(data["guide-category"]) : undefined,
  permalink: (data) => {
    if (data.permalink) return normalisePermalink(data.permalink);
    const category = data["guide-category"]
      ? normaliseSlug(data["guide-category"])
      : "uncategorized";
    return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
  },
});
