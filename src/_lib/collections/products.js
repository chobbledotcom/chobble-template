import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import { filterMap, findDuplicate, memberOf } from "#utils/array-utils.js";
import { sortItems } from "#utils/sorting.js";

const processGallery = (gallery) => {
  if (!gallery) return gallery;
  if (Array.isArray(gallery)) return gallery;
  return Object.values(gallery);
};

/**
 * Compute gallery array from gallery or header_image (for eleventyComputed)
 */
const computeGallery = (data) => {
  if (data.gallery) return data.gallery;
  if (data.header_image) return [data.header_image];
  return undefined;
};

/**
 * Process gallery data for an item
 * NOTE: Mutates item.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators
 */
const addGallery = (item) => {
  if (item.data.gallery) {
    item.data.gallery = processGallery(item.data.gallery);
  }
  return item;
};

const createProductsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  return products.map(addGallery);
};

const getProductsByCategory = (products, categorySlug) =>
  products
    .filter((product) => product.data.categories?.includes(categorySlug))
    .sort(sortItems);

/**
 * Get unique products that belong to any of the given categories
 */
const getProductsByCategories = (products, categorySlugs) => {
  if (!products || !categorySlugs?.length) return [];

  const isSelectedCategory = memberOf(categorySlugs);

  return products
    .filter((product) => product.data.categories?.some(isSelectedCategory))
    .sort(sortItems);
};

const getProductsByEvent = (products, eventSlug) =>
  products
    .filter((product) => product.data.events?.includes(eventSlug))
    .sort(sortItems);

const getFeaturedProducts = (products) =>
  products?.filter((p) => p.data.featured) || [];

/**
 * Creates a collection of all SKUs with their pricing data for the API
 * Returns an object mapping SKU -> { name, unit_price, max_quantity }
 * Throws an error if duplicate SKUs are found
 */
const createApiSkusCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const allSkuEntries = products.flatMap((product) => {
    const options = product.data.options;
    if (!options) return [];

    const productTitle = product.data.title || "";

    return filterMap(
      (option) => option.sku && option.unit_price !== undefined,
      (option) => [
        option.sku,
        {
          name: option.name ? `${productTitle} - ${option.name}` : productTitle,
          unit_price: option.unit_price,
          max_quantity: option.max_quantity ?? null,
        },
      ],
    )(options);
  });

  const duplicate = findDuplicate(allSkuEntries, ([sku]) => sku);
  if (duplicate) {
    const [sku, data] = duplicate;
    throw new Error(`Duplicate SKU "${sku}" found in product "${data.name}"`);
  }

  return Object.fromEntries(allSkuEntries);
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
