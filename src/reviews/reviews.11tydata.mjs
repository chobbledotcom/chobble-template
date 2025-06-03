import strings from "../_data/strings.js";

export default {
  eleventyComputed: {
    products: (data) => {
      const products = data.products || [];
      return products.map((product) => {
        // ditto
        return product.split(".")[0];
      });
    },
  },
};
