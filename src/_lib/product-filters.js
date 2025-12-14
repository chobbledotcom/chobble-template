import { sortByOrderThenTitle } from "./sorting.js";

/**
 * Parse filter attributes from product data
 * Expects format: ["Size: small", "Capacity: 3"]
 * Returns: { size: "small", capacity: "3" }
 */
const parseFilterAttributes = (filterAttributes) => {
  if (!filterAttributes || !Array.isArray(filterAttributes)) return {};

  const parsed = {};
  for (const attr of filterAttributes) {
    if (typeof attr !== "string") continue;
    const colonIndex = attr.indexOf(":");
    if (colonIndex === -1) continue;

    const key = attr.slice(0, colonIndex).trim().toLowerCase();
    const value = attr.slice(colonIndex + 1).trim().toLowerCase();
    if (key && value) {
      parsed[key] = value;
    }
  }
  return parsed;
};

/**
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 */
const getAllFilterAttributes = (products) => {
  if (!products) return {};

  const attributeMap = {};

  for (const product of products) {
    const attrs = parseFilterAttributes(product.data?.filter_attributes);
    for (const [key, value] of Object.entries(attrs)) {
      if (!attributeMap[key]) {
        attributeMap[key] = new Set();
      }
      attributeMap[key].add(value);
    }
  }

  // Convert sets to sorted arrays
  const result = {};
  for (const key of Object.keys(attributeMap).sort()) {
    result[key] = Array.from(attributeMap[key]).sort();
  }
  return result;
};

/**
 * Convert filter object to URL path segment
 * { size: "small", capacity: "3" } => "capacity/3/size/small"
 * Keys are sorted alphabetically
 */
const filterToPath = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return "";

  const sortedKeys = Object.keys(filters).sort();
  const segments = [];
  for (const key of sortedKeys) {
    segments.push(encodeURIComponent(key));
    segments.push(encodeURIComponent(filters[key]));
  }
  return segments.join("/");
};

/**
 * Parse URL path back to filter object
 * "capacity/3/size/small" => { capacity: "3", size: "small" }
 */
const pathToFilter = (path) => {
  if (!path) return {};

  const segments = path.split("/").filter(Boolean);
  const filters = {};

  for (let i = 0; i < segments.length - 1; i += 2) {
    const key = decodeURIComponent(segments[i]);
    const value = decodeURIComponent(segments[i + 1]);
    if (key && value) {
      filters[key] = value;
    }
  }
  return filters;
};

/**
 * Check if a product matches the given filters
 */
const productMatchesFilters = (product, filters) => {
  if (!filters || Object.keys(filters).length === 0) return true;

  const productAttrs = parseFilterAttributes(product.data?.filter_attributes);

  for (const [key, value] of Object.entries(filters)) {
    if (productAttrs[key] !== value) {
      return false;
    }
  }
  return true;
};

/**
 * Get products matching the given filters
 */
const getProductsByFilters = (products, filters) => {
  if (!products) return [];
  if (!filters || Object.keys(filters).length === 0) {
    return products.slice().sort(sortByOrderThenTitle);
  }

  return products
    .filter((product) => productMatchesFilters(product, filters))
    .sort(sortByOrderThenTitle);
};

/**
 * Generate all filter combinations that have matching products
 * Returns array of { filters: {...}, path: "...", count: N }
 */
const generateFilterCombinations = (products) => {
  if (!products) return [];

  const allAttributes = getAllFilterAttributes(products);
  const attributeKeys = Object.keys(allAttributes);

  if (attributeKeys.length === 0) return [];

  const combinations = [];
  const seen = new Set();

  // Generate all filter combinations recursively
  // This generates single-attribute, two-attribute, etc. combinations
  const generateCombos = (currentFilters, startKeyIndex) => {
    for (let i = startKeyIndex; i < attributeKeys.length; i++) {
      const key = attributeKeys[i];
      for (const value of allAttributes[key]) {
        const newFilters = { ...currentFilters, [key]: value };
        const path = filterToPath(newFilters);

        if (!seen.has(path)) {
          const matchingProducts = getProductsByFilters(products, newFilters);
          if (matchingProducts.length > 0) {
            seen.add(path);
            combinations.push({
              filters: newFilters,
              path,
              count: matchingProducts.length,
            });
            // Recurse to add more filters from the next keys
            generateCombos(newFilters, i + 1);
          }
        }
      }
    }
  };

  generateCombos({}, 0);

  return combinations;
};

/**
 * Create collection of filtered product pages
 */
const createFilteredProductPagesCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const combinations = generateFilterCombinations(products);

  return combinations.map((combo) => ({
    filters: combo.filters,
    path: combo.path,
    count: combo.count,
    products: getProductsByFilters(products, combo.filters),
  }));
};

/**
 * Create collection of all filter attributes with values
 */
const createFilterAttributesCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  return getAllFilterAttributes(products);
};

/**
 * Configure Eleventy with product filter collections and filters
 */
const configureProductFilters = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "filteredProductPages",
    createFilteredProductPagesCollection,
  );

  eleventyConfig.addCollection(
    "filterAttributes",
    createFilterAttributesCollection,
  );

  eleventyConfig.addFilter("getProductsByFilters", getProductsByFilters);
  eleventyConfig.addFilter("getAllFilterAttributes", getAllFilterAttributes);
  eleventyConfig.addFilter("filterToPath", filterToPath);
  eleventyConfig.addFilter("pathToFilter", pathToFilter);
  eleventyConfig.addFilter("parseFilterAttributes", parseFilterAttributes);
};

export {
  parseFilterAttributes,
  getAllFilterAttributes,
  filterToPath,
  pathToFilter,
  productMatchesFilters,
  getProductsByFilters,
  generateFilterCombinations,
  createFilteredProductPagesCollection,
  createFilterAttributesCollection,
  configureProductFilters,
};
