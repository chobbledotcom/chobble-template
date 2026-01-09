import { filter, flatMap, pipe, reduce } from "#utils/array-utils.js";

/**
 * Build a map of category slugs to property values, preferring highest order
 * Uses pipe composition to show clear data flow:
 * 1. Filter products that have the property
 * 2. FlatMap to create category entries
 * 3. Reduce to merge into mapping, keeping highest order
 */
const buildCategoryPropertyMap = (categories, products, propertyName) => {
  // Pre-build initial mapping from categories with order -1
  const initialMapping = Object.fromEntries(
    (categories || []).map((category) => [
      category.fileSlug,
      [category.data[propertyName], -1],
    ]),
  );

  // Define merge function that keeps highest order value
  const mergeByHighestOrder = (mapping, { categorySlug, value, order }) => {
    const currentEntry = mapping[categorySlug];
    const shouldOverride = !currentEntry || currentEntry[1] < order;
    return shouldOverride
      ? { ...mapping, [categorySlug]: [value, order] }
      : mapping;
  };

  // Process products through clear pipeline
  return pipe(
    filter((product) => product.data[propertyName]),
    flatMap((product) =>
      (product.data.categories || []).map((slug) => ({
        categorySlug: slug,
        value: product.data[propertyName],
        order: product.data.order || 0,
      })),
    ),
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
