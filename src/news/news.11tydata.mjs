import { buildPostMeta } from '../_lib/schema-helper.mjs';
import strings from '../_data/strings.js';

export default {
  eleventyComputed: {
    meta: data => buildPostMeta(data),
    permalink: (data) => {
      const dir = strings.news_permalink_dir || "news";
      return `/${dir}/${data.page.fileSlug}/`;
    }
  }
};