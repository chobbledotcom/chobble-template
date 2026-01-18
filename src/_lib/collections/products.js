/**
 * @typedef {import('11ty.ts').EleventyConfig} EleventyConfig
 */

import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import config from "#data/config.js";
import { filterMap, findDuplicate, memberOf } from "#utils/array-utils.js";
import { groupByWithCache } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/** Index products by category for O(1) lookups, cached per products array */
const indexByCategory = groupByWithCache(
  (product) => product.data.categories ?? [],
);

/** Index products by event for O(1) lookups, cached per products array */
const indexByEvent = groupByWithCache((product) => product.data.events ?? []);

/**
 * Compute gallery array from gallery or header_image (for eleventyComputed)
 * @returns {string[]} - Gallery array (empty if no images)
 */
const computeGallery = (data) => {
  if (data.gallery) return data.gallery;
  if (data.header_image) return [data.header_image];
  return [];
};

/**
 * Process gallery data for an item
 * NOTE: Mutates item.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators
 */
const addGallery = (item) => {
  if (item.data.gallery) {
    const gallery = Array.isArray(item.data.gallery)
      ? item.data.gallery
      : Object.values(item.data.gallery);
    const maxImages = config().products.max_images;
    item.data.gallery =
      maxImages === null ? gallery : gallery.slice(0, maxImages);
  }
  return item;
};

/**
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const createProductsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("products");
  return products.map(addGallery);
};

const getProductsByCategory = (products, categorySlug) =>
  (indexByCategory(products)[categorySlug] ?? []).sort(sortItems);

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
  (indexByEvent(products)[eventSlug] ?? []).sort(sortItems);

/**
 * Get featured products from a products collection
 * @param {import("#lib/types").EleventyCollectionItem[]} products - Products array from Eleventy collection
 * @returns {import("#lib/types").EleventyCollectionItem[]} Filtered array of featured products
 */
const getFeaturedProducts = (products) =>
  products.filter((p) => p.data.featured);

/**
 * Creates a collection of all SKUs with their pricing data for the API
 * Returns an object mapping SKU -> { name, unit_price, max_quantity }
 * Throws an error if duplicate SKUs are found
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const createApiSkusCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("products");
  const allSkuEntries = products.flatMap((product) => {
    /** @type {import("#lib/types").Option[]|undefined} */
    const options = product.data.options;
    if (!options) return [];

    const productTitle = product.data.title || "";

    return filterMap(
      (option) => option.sku,
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

const productsWithReviewsPage = withReviewsPage("products", addGallery);
const productReviewsRedirects = reviewsRedirects("products");

/**
 * Configure products collections and filters
 * @param {EleventyConfig} eleventyConfig - Eleventy configuration object
 */
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

  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);
  eleventyConfig.addFilter("getProductsByCategories", getProductsByCategories);
  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getProductsByEvent", getProductsByEvent);
  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getFeaturedProducts", getFeaturedProducts);
};

export { configureProducts, computeGallery, addGallery, getProductsByCategory };
