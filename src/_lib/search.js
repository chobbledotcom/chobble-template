const normaliseCategory = (category) => {
  if (!category) return "";
  // Handle full paths like "/categories/premium-widgets.md"
  let normalised = category.replace(/^\/categories\//, "").replace(/\.md$/, "");
  // Convert hyphens to spaces
  return normalised.replace(/-/g, " ");
};

const getAllKeywords = (products) => {
  if (!products) return [];

  const keywordSet = new Set();

  for (const product of products) {
    const keywords = product.data?.keywords;
    if (keywords) {
      for (const keyword of keywords) {
        keywordSet.add(keyword);
      }
    }

    const categories = product.data?.categories;
    if (categories) {
      for (const category of categories) {
        keywordSet.add(normaliseCategory(category));
      }
    }
  }

  return Array.from(keywordSet).sort();
};

const getProductsByKeyword = (products, keyword) => {
  if (!products || !keyword) return [];

  return products.filter((product) => {
    const keywords = product.data?.keywords;
    if (keywords?.includes(keyword)) return true;

    const categories = product.data?.categories;
    if (categories) {
      for (const category of categories) {
        if (normaliseCategory(category) === keyword) return true;
      }
    }

    return false;
  });
};

const createSearchKeywordsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product");
  return getAllKeywords(products);
};

const configureSearch = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "searchKeywords",
    createSearchKeywordsCollection,
  );
  eleventyConfig.addFilter("getProductsByKeyword", getProductsByKeyword);
  eleventyConfig.addFilter("getAllKeywords", getAllKeywords);
};

export {
  normaliseCategory,
  getAllKeywords,
  getProductsByKeyword,
  createSearchKeywordsCollection,
  configureSearch,
};
