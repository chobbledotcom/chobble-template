import strings from "../_data/strings.js";
import { buildPostMeta } from "../_lib/schema-helper.mjs";
import { normaliseSlug } from "../_lib/slug-utils.js";

export default {
  eleventyComputed: {
    meta: (data) => buildPostMeta(data),
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const dir = strings.news_permalink_dir || "news";
      return `/${dir}/${data.page.fileSlug}/`;
    },
    authorSlug: (data) => {
      if (!data.author) return null;
      return normaliseSlug(data.author);
    },
  },
};
