import strings from "#data/strings.js";

export default {
  eleventyComputed: {
    title: (data) => data.title || data.meta_title,
    // Set navigationParent for filtered product pages to enable navigation caching.
    // Without this, each of potentially thousands of filtered pages would cache
    // its own navigation HTML, causing unbounded memory growth during builds.
    navigationParent: (data) => {
      if (data.layout === "filtered-products") {
        return strings.product_name;
      }
      return data.navigationParent;
    },
  },
};
