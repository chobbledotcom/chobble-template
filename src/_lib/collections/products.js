import { sortByOrderThenTitle } from "#utils/sorting.js";
import { countProductReviews } from "#collections/reviews.js";
import config from "#data/config.js";

const processGallery = (gallery) => {
  if (!gallery) return gallery;
  if (Array.isArray(gallery)) return gallery;
  return Object.values(gallery);
};

// Compute gallery array from gallery or header_image (for eleventyComputed)
const computeGallery = (data) => {
  if (data.gallery) return data.gallery;
  if (data.header_image) return [data.header_image];
  return undefined;
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

const getProductsByCategory = (products, categorySlug) => {
  if (!products) return [];
  return products
    .filter((product) => product.data.categories?.includes(categorySlug))
    .sort(sortByOrderThenTitle);
};

const getProductsByEvent = (products, eventSlug) => {
  if (!products) return [];
  return products
    .filter((product) => product.data.events?.includes(eventSlug))
    .sort(sortByOrderThenTitle);
};

const getFeaturedProducts = (products) =>
  products?.filter((p) => p.data.featured) || [];

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

/**
 * Get visible reviews from collection API
 */
const getVisibleReviews = (collectionApi) => {
  const reviews = collectionApi.getFilteredByTag("review") || [];
  return reviews.filter((r) => r.data.hidden !== true);
};

/**
 * Creates a collection of products that have enough reviews
 * to warrant a separate reviews page (more than reviews_truncate_limit)
 */
const createProductsWithReviewsPageCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const visibleReviews = getVisibleReviews(collectionApi);
  const limit = config().reviews_truncate_limit;

  // If limit is -1, no truncation occurs so no separate page needed
  if (limit === -1) return [];

  return products
    .map(addGallery)
    .filter(
      (product) => countProductReviews(visibleReviews, product.fileSlug) > limit,
    );
};

/**
 * Creates a collection of redirect data for products that don't have
 * enough reviews for a separate page (reviews <= reviews_truncate_limit)
 */
const createProductReviewsRedirectsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const visibleReviews = getVisibleReviews(collectionApi);
  const limit = config().reviews_truncate_limit;

  // If limit is -1, no truncation occurs so all products need redirects
  if (limit === -1) {
    return products.map((product) => ({
      product,
      fileSlug: product.fileSlug,
    }));
  }

  return products
    .filter(
      (product) =>
        countProductReviews(visibleReviews, product.fileSlug) <= limit,
    )
    .map((product) => ({
      product,
      fileSlug: product.fileSlug,
    }));
};

const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", createProductsCollection);
  eleventyConfig.addCollection("apiSkus", createApiSkusCollection);
  eleventyConfig.addCollection(
    "productsWithReviewsPage",
    createProductsWithReviewsPageCollection,
  );
  eleventyConfig.addCollection(
    "productReviewsRedirects",
    createProductReviewsRedirectsCollection,
  );

  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);
  eleventyConfig.addFilter("getProductsByEvent", getProductsByEvent);
  eleventyConfig.addFilter("getFeaturedProducts", getFeaturedProducts);
};

export {
  processGallery,
  computeGallery,
  addGallery,
  createProductsCollection,
  createApiSkusCollection,
  createProductsWithReviewsPageCollection,
  createProductReviewsRedirectsCollection,
  getProductsByCategory,
  getProductsByEvent,
  getFeaturedProducts,
  configureProducts,
};
