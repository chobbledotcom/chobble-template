import { buildBaseMeta } from "../_lib/schema-helper.mjs";

export default {
  eleventyComputed: {
    meta: (data) => buildBaseMeta(data),
  },
};
