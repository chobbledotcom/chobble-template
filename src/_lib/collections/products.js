import { memoize } from "#utils/memoize.js";
import { sortByOrderThenTitle } from "#utils/sorting.js";

// Cache key for functions with (array, string) signature
// Uses array reference identity (via default behavior) + string value
const cacheKeyArrayAndSlug = (args) => {
  // First arg is array (identity-based by memoize default), second is slug
  // We combine array length as a sanity check with the slug
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

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

const createLatestReviewsCollection = (collectionApi, limit = 3) => {
  const reviews = collectionApi.getFilteredByTag("review") || [];
  const visibleReviews = reviews.filter(
    (review) => review.data.hidden !== true,
  );
  // Sort by date descending (newest first) and take the limit
  return visibleReviews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

const getProductsByCategory = memoize(
  (products, categorySlug) => {
    if (!products) return [];
    return products
      .filter((product) => product.data.categories?.includes(categorySlug))
      .sort(sortByOrderThenTitle);
  },
  { cacheKey: cacheKeyArrayAndSlug },
);

const getProductsByEvent = memoize(
  (products, eventSlug) => {
    if (!products) return [];
    return products
      .filter((product) => product.data.events?.includes(eventSlug))
      .sort(sortByOrderThenTitle);
  },
  { cacheKey: cacheKeyArrayAndSlug },
);

const getReviewsByProduct = memoize(
  (reviews, productSlug) =>
    (reviews || []).filter((review) =>
      review.data.products?.includes(productSlug),
    ),
  { cacheKey: cacheKeyArrayAndSlug },
);

const getFeaturedProducts = (products) =>
  products?.filter((p) => p.data.featured) || [];

const getLatestReviews = (reviews, limit = 3) => {
  if (!reviews) return [];
  return reviews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

/**
 * Creates a collection of all SKUs with their pricing data for the API
 * Returns an object mapping SKU -> { name, unit_price, max_quantity }
 */
const createApiSkusCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const skus = {};

  for (const product of products) {
    const options = product.data.options;
    if (!options) continue;

    const productTitle = product.data.title || "";

    for (const option of options) {
      if (option.sku && option.unit_price !== undefined) {
        // Build full name: "Product Title - Option Name" or just "Product Title"
        const name = option.name
          ? `${productTitle} - ${option.name}`
          : productTitle;

        skus[option.sku] = {
          name,
          unit_price: option.unit_price,
          max_quantity: option.max_quantity ?? null,
        };
      }
    }
  }

  return skus;
};

const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", createProductsCollection);
  eleventyConfig.addCollection("reviews", createReviewsCollection);
  eleventyConfig.addCollection(
    "visibleReviews",
    createVisibleReviewsCollection,
  );
  eleventyConfig.addCollection("latestReviews", (collectionApi) =>
    createLatestReviewsCollection(collectionApi),
  );
  eleventyConfig.addCollection("apiSkus", createApiSkusCollection);

  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);

  eleventyConfig.addFilter("getProductsByEvent", getProductsByEvent);

  eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);

  eleventyConfig.addFilter("getFeaturedProducts", getFeaturedProducts);

  eleventyConfig.addFilter("getLatestReviews", getLatestReviews);
};

export {
  processGallery,
  addGallery,
  createProductsCollection,
  createReviewsCollection,
  createVisibleReviewsCollection,
  createLatestReviewsCollection,
  createApiSkusCollection,
  getProductsByCategory,
  getProductsByEvent,
  getReviewsByProduct,
  getFeaturedProducts,
  getLatestReviews,
  configureProducts,
};
