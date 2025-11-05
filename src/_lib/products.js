const processGallery = (gallery) => {
  if (!gallery) return gallery;
  if (Array.isArray(gallery)) return gallery;
  return Object.values(gallery);
};

const addGallery = (item) => {
  // NOTE: This function mutates the item object directly rather than using
  // functional programming patterns (like spread operators) because Eleventy
  // template objects have special getters and internal state. Using spread
  // operators triggers premature access to templateContent, causing errors.
  if (item.data.gallery) {
    item.data.gallery = processGallery(item.data.gallery);
  }
  return item;
};

const createProductsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  return products.map(addGallery);
};

const createReviewsCollection = (collectionApi) => {
  return collectionApi.getFilteredByTag("review") || [];
};

const getProductsByCategory = (products, categorySlug) => {
  if (!products) return [];
  return products
    .filter((product) => product.data.categories?.includes(categorySlug))
    .sort((a, b) => {
      const orderDiff = (a.data.order || 0) - (b.data.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.data.name || "").localeCompare(b.data.name || "");
    });
};

const getReviewsByProduct = (reviews, productSlug) =>
  (reviews || []).filter((review) =>
    review.data.products?.includes(productSlug),
  );

const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", createProductsCollection);
  eleventyConfig.addCollection("reviews", createReviewsCollection);

  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);

  eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);
};

export {
  processGallery,
  addGallery,
  createProductsCollection,
  createReviewsCollection,
  getProductsByCategory,
  getReviewsByProduct,
  configureProducts,
};
