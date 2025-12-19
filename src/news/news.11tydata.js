import strings from "#data/strings.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    permalink: (data) => buildPermalink(data, strings.news_permalink_dir),
    authorSlug: (data) => {
      if (!data.author) return null;
      return normaliseSlug(data.author);
    },
  },
};
