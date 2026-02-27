import { normalisePermalink } from "#utils/slug-utils.js";

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    title: (data) => data.title || data.meta_title,
    permalink: (data) => normalisePermalink(data.permalink),
  },
};
