import strings from "../_data/strings.js";
import { normaliseSlug, buildPermalink } from "../_lib/slug-utils.js";

export default {
  eleventyComputed: {
    permalink: (data) =>
      buildPermalink(data, strings.news_permalink_dir || "news"),
    authorSlug: (data) => {
      if (!data.author) return null;
      return normaliseSlug(data.author);
    },
  },
};
