import strings from "../_data/strings.js";
import { buildPostMeta } from "../_lib/schema-helper.mjs";

export default {
  eleventyComputed: {
    meta: (data) => buildPostMeta(data),
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const dir = strings.news_permalink_dir || "news";
      return `/${dir}/${data.page.fileSlug}/`;
    },
  },
};
