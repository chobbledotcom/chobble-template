import strings from "../_data/strings.js";

export default {
  eleventyComputed: {
    products: (data) => {
      const products = data.products || [];
      return products.map((product) => {
        // convert to just the file slug
        const pathParts = product.split(".")[0].split("/");
        return pathParts[pathParts.length - 1];
      });
    },
  },
};
