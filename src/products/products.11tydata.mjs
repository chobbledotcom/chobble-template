import strings from "../_data/strings.js";
import { normaliseSlug, buildPermalink } from "../_lib/slug-utils.js";

export default {
  eleventyComputed: {
    categories: (data) => {
      const categories = data.categories || [];
      return categories.map(normaliseSlug);
    },
    gallery: (data) => {
      if (data.gallery) {
        return data.gallery;
      }
      if (data.header_image) {
        return [data.header_image];
      }
      return undefined;
    },
    navigationParent: () => strings.product_name,
    permalink: (data) =>
      buildPermalink(data, strings.product_permalink_dir || "products"),
  },
};
