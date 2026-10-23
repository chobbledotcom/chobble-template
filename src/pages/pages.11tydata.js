import { normalisePermalink } from "#utils/slug-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    navigationParent: (data) => data.eleventyNavigation?.parent || null,
    permalink: (data) => normalisePermalink(data.permalink),
  },
};
