const createInitialMapping = (categories, propertyName) =>
  (categories || []).reduce(
    (acc, category) => ({ ...acc, [category.fileSlug]: [category.data[propertyName], -1] }),
    {},
  );

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

const buildCategoryPropertyMap = (categories, products, propertyName) => {
  const initialMapping = createInitialMapping(categories, propertyName);
  const productEntries = extractProductEntries(products, propertyName);

  return productEntries.reduce((acc, { categorySlug, value, order }) => {
    const currentEntry = acc[categorySlug];
    const shouldOverride = !currentEntry || currentEntry[1] < order;
    return shouldOverride ? { ...acc, [categorySlug]: [value, order] } : acc;
  }, initialMapping);
};

const buildCategoryImageMap = (categories, products) =>
  buildCategoryPropertyMap(categories, products, "header_image");

const assignCategoryImages = (
  categories,
  categoryImages,
  categoryThumbnails = {},
) => {
  if (!categories) return [];
  // NOTE: This function mutates category objects directly rather than using
  // functional programming patterns (like spread operators) because Eleventy
  // template objects have special getters and internal state. Using spread
  // operators triggers premature access to templateContent, causing errors.
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
