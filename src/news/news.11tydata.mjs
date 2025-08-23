import { buildPostMeta } from '../_lib/schema-helper.mjs';

export default {
  eleventyComputed: {
    meta: data => buildPostMeta(data)
  }
};