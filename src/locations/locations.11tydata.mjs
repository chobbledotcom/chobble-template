import strings from "../_data/strings.js";
import { buildBaseMeta } from "../_lib/schema-helper.mjs";

export default {
  eleventyComputed: {
    meta: (data) => buildBaseMeta(data),
    navigationParent: () => strings.location_name,
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const dir = strings.location_permalink_dir;
      return `/${dir}/${data.page.fileSlug}/`;
    },
    eleventyNavigation: (data) => {
      if (data.eleventyNavigation) return data.eleventyNavigation;
      return {
        key: data.title,
        parent: strings.location_name,
        order: data.link_order || 0,
      };
    },
  },
};
