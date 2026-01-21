/**
 * Products collection and filters
 *
 * @module #collections/products
 */

/** @typedef {import('11ty.ts').EleventyConfig} EleventyConfig */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */
/** @typedef {import("#lib/types").ProductItemData} ProductItemData */
/** @typedef {import("#lib/types").ProductOption} ProductOption */

import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import config from "#data/config.js";
import { filterMap, findDuplicate, memberOf } from "#toolkit/fp/array.js";
import { createArrayFieldIndexer } from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";

/** Index products by category for O(1) lookups, cached per products array */
const indexByCategory = createArrayFieldIndexer("categories");

/** Index products by event for O(1) lookups, cached per products array */
const indexByEvent = createArrayFieldIndexer("events");

/**
 * Compute gallery array from gallery or header_image (for eleventyComputed).
 *
 * @param {ProductItemData} data - Product data from frontmatter
 * @returns {string[]} Gallery array (empty if no images)
 */
const computeGallery = (data) => {
  if (data.gallery) return data.gallery;
  if (data.header_image) return [data.header_image];
  return [];
};

/**
 * Process gallery data for an item.
 * NOTE: Mutates item.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators.
 *
 * @param {ProductCollectionItem} item - Product collection item
 * @returns {ProductCollectionItem} Same item with processed gallery
 */
const addGallery = (item) => {
  if (item.data.gallery) {
    // PagesCMS may send gallery as object instead of array - normalize it
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
 * Create the products collection.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {ProductCollectionItem[]}
 */
const createProductsCollection = (collectionApi) => {
  /** @type {ProductCollectionItem[]} */
  const products = collectionApi.getFilteredByTag("products");
  return products.map(addGallery);
};

/**
 * Get products belonging to a specific category.
 *
 * @param {ProductCollectionItem[]} products - All products
 * @param {string} categorySlug - Category slug to filter by
 * @returns {ProductCollectionItem[]} Sorted products in this category
 */
const getProductsByCategory = (products, categorySlug) =>
  (indexByCategory(products)[categorySlug] ?? []).sort(sortItems);

/**
 * Get unique products that belong to any of the given categories.
 * Note: Handles undefined/null inputs from Liquid templates gracefully.
 *
 * @param {ProductCollectionItem[] | undefined | null} products - All products
 * @param {string[] | undefined | null} categorySlugs - Category slugs to filter by
 * @returns {ProductCollectionItem[]} Sorted products matching any category
 */
const getProductsByCategories = (products, categorySlugs) => {
  if (!products || !categorySlugs?.length) return [];

  const isSelectedCategory = memberOf(categorySlugs);

  return products
    .filter((p) => (p.data.categories ?? []).some(isSelectedCategory))
    .sort(sortItems);
};

/**
 * Get products belonging to a specific event.
 *
 * @param {ProductCollectionItem[]} products - All products
 * @param {string} eventSlug - Event slug to filter by
 * @returns {ProductCollectionItem[]} Sorted products for this event
 */
const getProductsByEvent = (products, eventSlug) =>
  (indexByEvent(products)[eventSlug] ?? []).sort(sortItems);

/** @typedef {[string, { name: string, unit_price: string | number, max_quantity: number | null }]} SkuEntry */

/** Extract SKU entries from a product's options */
const extractSkuEntries = (/** @type {ProductCollectionItem} */ product) => {
  const options = /** @type {ProductOption[] | undefined} */ (
    product.data.options
  );
  if (!options) return [];
  const title = product.data.title ?? "";
  return filterMap(
    (/** @type {ProductOption} */ o) => Boolean(o.sku),
    (/** @type {ProductOption} */ o) =>
      /** @type {SkuEntry} */ ([
        o.sku,
        {
          name: o.name ? `${title} - ${o.name}` : title,
          unit_price: o.unit_price,
          max_quantity: o.max_quantity ?? null,
        },
      ]),
  )(options);
};

/**
 * Creates a collection of all SKUs with their pricing data for the API.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const createApiSkusCollection = (collectionApi) => {
  const products = /** @type {ProductCollectionItem[]} */ (
    collectionApi.getFilteredByTag("products")
  );
  /** @type {SkuEntry[]} */
  const allSkuEntries = products.flatMap(extractSkuEntries);
  const duplicate = findDuplicate(allSkuEntries, ([sku]) => sku);
  if (duplicate)
    throw new Error(
      `Duplicate SKU "${duplicate[0]}" found in product "${duplicate[1].name}"`,
    );
  return Object.fromEntries(allSkuEntries);
};

const productsWithReviewsPage = withReviewsPage("products", addGallery);
const productReviewsRedirects = reviewsRedirects("products");

/**
 * Configure products collections and filters.
 *
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
  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getProductsByCategories", getProductsByCategories);
  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getProductsByEvent", getProductsByEvent);
};

export { configureProducts, computeGallery, addGallery, getProductsByCategory };
