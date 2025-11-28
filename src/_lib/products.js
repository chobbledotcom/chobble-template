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

const createVisibleReviewsCollection = (collectionApi) => {
  const reviews = collectionApi.getFilteredByTag("review") || [];
  return reviews.filter((review) => review.data.hidden !== true);
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

const getFeaturedProducts = (products) =>
  products?.filter((p) => p.data.featured) || [];

const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", createProductsCollection);
  eleventyConfig.addCollection("reviews", createReviewsCollection);
  eleventyConfig.addCollection(
    "visibleReviews",
    createVisibleReviewsCollection,
  );

  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);

  eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);

  eleventyConfig.addFilter("getFeaturedProducts", getFeaturedProducts);
};

export {
  processGallery,
  addGallery,
  createProductsCollection,
  createReviewsCollection,
  createVisibleReviewsCollection,
  getProductsByCategory,
  getReviewsByProduct,
  getFeaturedProducts,
  configureProducts,
};
