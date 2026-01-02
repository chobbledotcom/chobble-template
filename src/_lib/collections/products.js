import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import { sortItems } from "#utils/sorting.js";

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
    .sort(sortItems);
};

/**
 * Get unique products that belong to any of the given categories
 * Replaces gnarly Liquid nested loops with contains checks
 */
const getProductsByCategories = (products, categorySlugs) => {
  if (!products || !categorySlugs?.length) return [];

  const categorySet = new Set(categorySlugs);

  return products
    .filter((product) =>
      product.data.categories?.some((cat) => categorySet.has(cat)),
    )
    .sort(sortItems);
};

const getProductsByEvent = (products, eventSlug) => {
  if (!products) return [];
  return products
    .filter((product) => product.data.events?.includes(eventSlug))
    .sort(sortItems);
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

const productsWithReviewsPage = withReviewsPage(
  "product",
  "products",
  addGallery,
);
const productReviewsRedirects = reviewsRedirects("product", "products");

const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", createProductsCollection);
  eleventyConfig.addCollection("apiSkus", createApiSkusCollection);
  eleventyConfig.addCollection(
    "productsWithReviewsPage",
    productsWithReviewsPage,
  );
  eleventyConfig.addCollection(
    "productReviewsRedirects",
    productReviewsRedirects,
  );

  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);
  eleventyConfig.addFilter("getProductsByCategories", getProductsByCategories);
  eleventyConfig.addFilter("getProductsByEvent", getProductsByEvent);
  eleventyConfig.addFilter("getFeaturedProducts", getFeaturedProducts);
};

export {
  processGallery,
  computeGallery,
  addGallery,
  createProductsCollection,
  createApiSkusCollection,
  productsWithReviewsPage,
  productReviewsRedirects,
  getProductsByCategory,
  getProductsByCategories,
  getProductsByEvent,
  getFeaturedProducts,
  configureProducts,
};
