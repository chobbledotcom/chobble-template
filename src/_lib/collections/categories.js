import { reduce } from "#utils/array-utils.js";

/**
 * Create initial mapping from category slugs to [propertyValue, order] pairs
 */
const createInitialMapping = (categories, propertyName) =>
  Object.fromEntries(
    (categories || []).map((category) => [
      category.fileSlug,
      [category.data[propertyName], -1],
    ]),
  );

/**
 * Extract (categorySlug, value, order) entries from products for a given property
 */
const extractProductEntries = (products, propertyName) =>
  (products || [])
    .filter((product) => product.data[propertyName])
    .flatMap((product) =>
      (product.data.categories || []).map((slug) => ({
        categorySlug: slug,
        value: product.data[propertyName],
        order: product.data.order || 0,
      })),
    );

/**
 * Determine if new entry should override existing based on order
 */
const shouldOverride = (currentEntry, newOrder) =>
  !currentEntry || currentEntry[1] < newOrder;

/**
 * Update mapping with new entry if it has higher order than existing
 */
const withHigherOrderEntry = (mapping, { categorySlug, value, order }) =>
  shouldOverride(mapping[categorySlug], order)
    ? { ...mapping, [categorySlug]: [value, order] }
    : mapping;

/**
 * Build a map of category slugs to property values, preferring highest order
 */
const buildCategoryPropertyMap = (categories, products, propertyName) =>
  reduce(
    withHigherOrderEntry,
    createInitialMapping(categories, propertyName),
  )(extractProductEntries(products, propertyName));

const buildCategoryImageMap = (categories, products) =>
  buildCategoryPropertyMap(categories, products, "header_image");

/**
 * Assign images to categories from the property maps
 * NOTE: Mutates category.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators
 */
const assignCategoryImages = (
  categories,
  categoryImages,
  categoryThumbnails = {},
) => {
  return categories.map((category) => {
    category.data.header_image = categoryImages[category.fileSlug]?.[0];
    const thumbnail = categoryThumbnails[category.fileSlug]?.[0];
    if (thumbnail) category.data.thumbnail = thumbnail;
    return category;
  });
};

const createCategoriesCollection = (collectionApi) => {
  const categories = collectionApi.getFilteredByTag("category");

  if (!categories || categories.length === 0) return [];

  const products = collectionApi.getFilteredByTag("product");
  const categoryImages = buildCategoryImageMap(categories, products);
  const categoryThumbnails = buildCategoryPropertyMap(
    categories,
    products,
    "thumbnail",
  );

  return assignCategoryImages(categories, categoryImages, categoryThumbnails);
};

const getFeaturedCategories = (categories) =>
  categories?.filter((c) => c.data.featured) || [];

const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
  eleventyConfig.addFilter("getFeaturedCategories", getFeaturedCategories);
};

export {
  buildCategoryPropertyMap,
  buildCategoryImageMap,
  assignCategoryImages,
  createCategoriesCollection,
  getFeaturedCategories,
  configureCategories,
};
