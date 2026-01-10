import { flatMap, pipe, reduce } from "#utils/array-utils.js";

/**
 * Build a map of category slugs to property values, preferring highest order
 * Uses pipe composition to show clear data flow:
 * 1. FlatMap products with conditional - only emit entries for products with property
 * 2. Reduce to merge into mapping, keeping highest order
 */
const buildCategoryPropertyMap = (categories, products, propertyName) => {
  const initialMapping = Object.fromEntries(
    (categories || []).map((category) => [
      category.fileSlug,
      [category.data[propertyName], -1],
    ]),
  );
  const mergeByHighestOrder = (mapping, { categorySlug, value, order }) => {
    const entry = mapping[categorySlug];
    const shouldOverride = !entry || entry[1] < order;
    return shouldOverride
      ? { ...mapping, [categorySlug]: [value, order] }
      : mapping;
  };
  return pipe(
    flatMap((product) => {
      if (!product.data[propertyName]) return [];
      return (product.data.categories || []).map((slug) => ({
        categorySlug: slug,
        value: product.data[propertyName],
        order: product.data.order || 0,
      }));
    }),
    reduce(mergeByHighestOrder, initialMapping),
  )(products || []);
};

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

/**
 * Get featured categories from a categories collection
 * @param {import("#lib/types").EleventyCollectionItem[]} categories - Categories array from Eleventy collection
 * @returns {import("#lib/types").EleventyCollectionItem[]} Filtered array of featured categories
 */
const getFeaturedCategories = (categories) =>
  categories.filter((c) => c.data.featured);

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
