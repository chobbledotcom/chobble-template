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
import { addDataFilter } from "#eleventy/add-data-filter.js";
import {
  filterMap,
  findDuplicate,
  memberOf,
  notMemberOf,
} from "#toolkit/fp/array.js";
import {
  createArrayFieldIndexer,
  createIndexer,
  featuredCollection,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

/** Index products by category for O(1) lookups, cached per products array */
const indexByCategory = createArrayFieldIndexer("categories");

/** Index products by event for O(1) lookups, cached per products array */
const indexByEvent = createArrayFieldIndexer("events");

/** Index products by fileSlug for O(1) lookups, cached per products array */
const indexBySlug = createIndexer((product) =>
  product.fileSlug ? [product.fileSlug] : [],
);

/**
 * Merge products explicitly listed in a parent item's frontmatter with
 * products found via reverse lookup (products that reference the parent).
 * Explicit products maintain their frontmatter order; reverse-lookup
 * products are sorted by order/title and appended after.
 * Duplicates are removed (explicit list takes precedence).
 *
 * @param {ProductCollectionItem[]} reverseProducts - Products from reverse lookup, already sorted
 * @param {ProductCollectionItem[]} allProducts - All products (for slug lookups)
 * @param {string} parentSlug - The category or event slug
 * @param {Array<{fileSlug: string, data: {products?: string[]}}>} [parentItems] - Categories or events collection
 * @returns {ProductCollectionItem[]} Merged product list
 */
const mergeWithExplicitProducts = (
  reverseProducts,
  allProducts,
  parentSlug,
  parentItems,
) => {
  if (!parentItems) return reverseProducts;

  const parent = parentItems.find((p) => p.fileSlug === parentSlug);
  if (!parent?.data?.products?.length) return reverseProducts;

  const slugIndex = indexBySlug(allProducts);
  const explicitSlugs = parent.data.products.flatMap((ref) => {
    const slug = normaliseSlug(ref);
    return slug ? [slug] : [];
  });

  const explicitProducts = explicitSlugs
    .map((slug) => slugIndex[slug]?.[0])
    .filter(Boolean);

  const isNotExplicit = notMemberOf(explicitSlugs);
  const additionalProducts = reverseProducts.filter((p) =>
    isNotExplicit(p.fileSlug),
  );

  return [...explicitProducts, ...additionalProducts];
};

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
const createProductsCollection = (collectionApi) =>
  getProductsFromApi(collectionApi).map(addGallery);

/**
 * Create a bidirectional product filter for a given indexer.
 * Combines products from reverse lookup (products referencing a parent) with
 * products explicitly listed in the parent's frontmatter.
 *
 * @param {(products: ProductCollectionItem[]) => Record<string, ProductCollectionItem[]>} indexer
 * @returns {(products: ProductCollectionItem[], slug: string, parentItems?: any[]) => ProductCollectionItem[]}
 */
const createBidirectionalFilter = (indexer) => (products, slug, parentItems) =>
  mergeWithExplicitProducts(
    (indexer(products)[slug] ?? []).sort(sortItems),
    products,
    slug,
    parentItems,
  );

/** Get products belonging to a specific category (bidirectional). */
const getProductsByCategory = createBidirectionalFilter(indexByCategory);

/** Get products belonging to a specific event (bidirectional). */
const getProductsByEvent = createBidirectionalFilter(indexByEvent);

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
    .filter((p) =>
      p.data.categories.some((cat) => isSelectedCategory(normaliseSlug(cat))),
    )
    .sort(sortItems);
};

/** @typedef {[string, { name: string, unit_price: string | number, max_quantity: number | null }]} SkuEntry */

/**
 * Check if an option has a SKU.
 * @param {ProductOption} option
 * @returns {boolean}
 */
const hasSku = (option) => Boolean(option.sku);

/**
 * Convert a product option to a SKU entry.
 * @param {string} productTitle
 * @returns {(option: ProductOption) => SkuEntry}
 */
const toSkuEntry = (productTitle) => (option) => [
  option.sku,
  {
    name: option.name ? `${productTitle} - ${option.name}` : productTitle,
    unit_price: option.unit_price,
    max_quantity: option.max_quantity ?? null,
  },
];

/**
 * Extract SKU entries from a product's options.
 * @param {ProductCollectionItem} product
 * @returns {SkuEntry[]}
 */
const extractSkuEntries = (product) => {
  if (!product.data.options) return [];
  return filterMap(
    hasSku,
    toSkuEntry(product.data.title),
  )(product.data.options);
};

/**
 * Creates a collection of all SKUs with their pricing data for the API.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Record<string, { name: string, unit_price: string | number, max_quantity: number | null }>}
 */
const createApiSkusCollection = (collectionApi) => {
  const products = getProductsFromApi(collectionApi);
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
  eleventyConfig.addCollection(
    "featuredProducts",
    featuredCollection(createProductsCollection),
  );
  eleventyConfig.addCollection("apiSkus", createApiSkusCollection);
  eleventyConfig.addCollection(
    "productsWithReviewsPage",
    productsWithReviewsPage,
  );
  eleventyConfig.addCollection(
    "productReviewsRedirects",
    productReviewsRedirects,
  );

  addDataFilter(eleventyConfig, "getProductsByCategory", getProductsByCategory);
  addDataFilter(
    eleventyConfig,
    "getProductsByCategories",
    getProductsByCategories,
  );
  addDataFilter(eleventyConfig, "getProductsByEvent", getProductsByEvent);
};

export { configureProducts, computeGallery, addGallery, getProductsByCategory };
