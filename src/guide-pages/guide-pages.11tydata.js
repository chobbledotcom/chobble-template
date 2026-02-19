import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("guide", {
  /** @param {*} data */
  "guide-category": (data) => normaliseSlug(data["guide-category"]),
  /** @param {*} data */
  parentGuideCategory: (data) => normaliseSlug(data["guide-category"]),
  /** @param {*} data */
  permalink: (data) => {
    if (data.permalink) return data.permalink;
    const category = normaliseSlug(data["guide-category"]) || "uncategorized";
    return `/${strings.guide_permalink_dir}/${category}/${data.page.fileSlug}/`;
  },
});
