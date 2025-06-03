import strings from "../_data/strings.js";

export default {
  eleventyComputed: {
    categories: (data) => {
      const categories = data.categories || [];
      return categories.map((category) => {
        // convert to just the file slug
        const pathParts = category.split(".")[0].split("/");
        return pathParts[pathParts.length - 1];
      });
    },
    navigationParent: () => strings.product_name,
    permalink: (data) => {
      const dir = strings.product_permalink_dir || "products";
      return `${dir}/${data.page.fileSlug}/`;
    },
  },
};
