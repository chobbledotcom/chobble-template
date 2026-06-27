/**
 * Products collection and filters
 *
 * @module #collections/products
 */

/** @typedef {import('11ty.ts').EleventyConfig} EleventyConfig */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */
/** @typedef {import("#lib/types").ProductItemData} ProductItemData */
/** @typedef {import("#lib/types").ProductOption} ProductOption */
/** @typedef {import("#lib/types").MenuItemCollectionItem} MenuItemCollectionItem */

import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import config from "#data/config.js";
import { addDataFilter } from "#eleventy/add-data-filter.js";
import { toAbsoluteImageUrl } from "#media/image-frontmatter.js";
import {
  filterMap,
  findDuplicate,
  memberOf,
  notMemberOf,
  unique,
} from "#toolkit/fp/array.js";
import {
  createArrayFieldIndexer,
  createIndexer,
  featuredCollection,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { isAmbiguousPrice, parsePrice } from "#utils/price-utils.js";
import { getDefaultMaxQuantity } from "#utils/product-cart-data.js";
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
 * @param {{product: string}[] | undefined} [explicitProductRefs] - Product references from the page's frontmatter
 * @returns {ProductCollectionItem[]} Merged product list
 */
const mergeWithExplicitProducts = (
  reverseProducts,
  allProducts,
  explicitProductRefs,
) => {
  if (!explicitProductRefs?.length) return reverseProducts;

  const slugIndex = indexBySlug(allProducts);
  const validRefs = explicitProductRefs.filter((ref) => ref.product);
  if (!validRefs.length) return reverseProducts;

  const explicitSlugs = unique(
    validRefs.map((ref) => normaliseSlug(ref.product)),
  );

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
 * Compute gallery array from gallery (for eleventyComputed).
 *
 * @param {ProductItemData} data - Product data from frontmatter
 * @returns {string[]} Gallery array (empty if no gallery)
 */
const computeGallery = (data) => {
  if (data.gallery) return data.gallery.map(toAbsoluteImageUrl);
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
    item.data.gallery = item.data.gallery.map(toAbsoluteImageUrl);
  }
  return item;
};

/**
 * Normalise data.categories so values are always plain slugs, regardless of
 * whether the editor used a slug, a path like "categories/foo.md", or a
 * PagesCMS reference like "src/categories/foo.md".
 *
 * @param {ProductCollectionItem} item
 * @returns {ProductCollectionItem}
 */
const normaliseCategorySlugs = (item) => {
  if (item.data.categories)
    item.data.categories = item.data.categories.map(normaliseSlug);
  return item;
};

const processProduct = (item) => normaliseCategorySlugs(addGallery(item));

/**
 * Create the products collection.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {ProductCollectionItem[]}
 */
const createProductsCollection = (collectionApi) =>
  getProductsFromApi(collectionApi).map(processProduct).sort(sortItems);

/**
 * Create a bidirectional product filter for a given indexer.
 * Combines products from reverse lookup (products referencing a parent) with
 * products explicitly listed in the page's frontmatter products field.
 *
 * @param {(products: ProductCollectionItem[]) => Record<string, ProductCollectionItem[]>} indexer
 * @returns {(products: ProductCollectionItem[], slug: string, explicitProductRefs?: {product: string}[]) => ProductCollectionItem[]}
 */
const createBidirectionalFilter =
  (indexer) => (products, slug, explicitProductRefs) =>
    mergeWithExplicitProducts(
      (indexer(products)[slug] ?? []).sort(sortItems),
      products,
      explicitProductRefs,
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
  return filterMap(hasSku, toSkuEntry(product.data.name))(product.data.options);
};

/**
 * Whether a menu item exposes a buyable, SKU-backed single price for the
 * pricing API: it has a top-level `sku` and a price that is present,
 * parseable, and a single numeric amount (not ambiguous like "£10 / £12").
 * @param {MenuItemCollectionItem} menuItem
 * @returns {boolean}
 */
const hasBuyableMenuSku = (menuItem) =>
  Boolean(menuItem.data.sku) &&
  !isAmbiguousPrice(menuItem.data.price) &&
  Number.isFinite(parsePrice(null)(menuItem.data.price));

/**
 * Convert a buyable menu item into a SKU entry for the pricing API.
 * @param {MenuItemCollectionItem} menuItem
 * @returns {SkuEntry}
 */
const toMenuSkuEntry = (menuItem) => [
  menuItem.data.sku,
  {
    name: menuItem.data.name,
    unit_price: parsePrice(null)(menuItem.data.price),
    max_quantity: getDefaultMaxQuantity(menuItem.data),
  },
];

/** Extract SKU entries from buyable, SKU-backed menu items. */
const extractMenuSkuEntries = filterMap(hasBuyableMenuSku, toMenuSkuEntry);

/**
 * Creates a collection of all SKUs with their pricing data for the API.
 * Indexes product option SKUs and buyable menu-item SKUs, with duplicate
 * detection across the combined set.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Record<string, { name: string, unit_price: string | number, max_quantity: number | null }>}
 */
const createApiSkusCollection = (collectionApi) => {
  const products = getProductsFromApi(collectionApi);
  const menuItems = collectionApi.getFilteredByTag("menu-items");
  const allSkuEntries = [
    ...products.flatMap(extractSkuEntries),
    ...extractMenuSkuEntries(menuItems),
  ];
  const duplicate = findDuplicate(allSkuEntries, ([sku]) => sku);
  if (duplicate)
    throw new Error(
      `Duplicate SKU "${duplicate[0]}" found in "${duplicate[1].name}"`,
    );
  return Object.fromEntries(allSkuEntries);
};

const productsWithReviewsPage = withReviewsPage("products", processProduct);
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

export { addGallery, computeGallery, configureProducts, getProductsByCategory };
