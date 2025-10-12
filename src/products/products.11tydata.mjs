import strings from "../_data/strings.js";
import { normaliseSlug } from "../_lib/slug-utils.js";
import { buildProductMeta } from "../_lib/schema-helper.mjs";

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
    header_image: (data) => {
      if (data.header_image) {
        return data.header_image;
      }
      const autoHeaderImage = data.config?.autoHeaderImage ?? true;
      if (autoHeaderImage && data.gallery) {
        return data.gallery[0];
      }
      return undefined;
    },
    navigationParent: () => strings.product_name,
    permalink: (data) => {
      const dir = strings.product_permalink_dir || "products";
      return `${dir}/${data.page.fileSlug}/`;
    },
    meta: (data) => buildProductMeta(data),
  },
};
