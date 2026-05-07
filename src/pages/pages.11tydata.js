import { normalisePermalink } from "#utils/slug-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    name: (data) => data.name || data.meta_title,
    navigationParent: (data) => data.eleventyNavigation?.parent || null,
    permalink: (data) => normalisePermalink(data.permalink),
  },
};
