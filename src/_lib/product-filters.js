import { sortByOrderThenTitle } from "./sorting.js";
import strings from "../_data/strings.js";

/**
 * Normalize a string for comparison: lowercase, strip spaces and special chars
 */
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Parse filter attributes from product data
 * Expects format: [{name: "Size", value: "small"}, {name: "Capacity", value: "3"}]
 * Returns: { size: "small", capacity: "3" }
 */
const parseFilterAttributes = (filterAttributes) => {
  if (!filterAttributes) return {};

  const parsed = {};
  for (const attr of filterAttributes) {
    const key = attr.name.trim().toLowerCase();
    const value = attr.value.trim().toLowerCase();
    parsed[key] = value;
  }
  return parsed;
};

/**
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 */
const getAllFilterAttributes = (products) => {
  const attributeMap = {};

  for (const product of products) {
    const attrs = parseFilterAttributes(product.data.filter_attributes);
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
 * Build a lookup map from lowercase keys/values to original capitalization
 * Returns: { "size": "Size", "compact": "Compact", "pro": "Pro" }
 */
const buildDisplayLookup = (products) => {
  const lookup = {};

  for (const product of products) {
    const filterAttrs = product.data.filter_attributes;
    if (!filterAttrs) continue;

    for (const attr of filterAttrs) {
      const lowerKey = attr.name.trim().toLowerCase();
      const lowerValue = attr.value.trim().toLowerCase();

      // Store original capitalization (first one wins)
      if (!lookup[lowerKey]) lookup[lowerKey] = attr.name.trim();
      if (!lookup[lowerValue]) lookup[lowerValue] = attr.value.trim();
    }
  }

  return lookup;
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
 * Uses normalized comparison (lowercase, no special chars/spaces)
 */
const productMatchesFilters = (product, filters) => {
  if (!filters || Object.keys(filters).length === 0) return true;

  const productAttrs = parseFilterAttributes(product.data.filter_attributes);

  for (const [key, value] of Object.entries(filters)) {
    if (normalize(productAttrs[key] || "") !== normalize(value)) {
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
 * Build a filter description string from filters using display lookup
 * { size: "compact", type: "pro" } => "Size: compact, Type: pro"
 */
const buildFilterDescription = (filters, displayLookup) => {
  return Object.entries(filters)
    .map(([key, value]) => `${displayLookup[key]}: ${displayLookup[value]}`)
    .join(", ");
};

/**
 * Create collection of filtered product pages
 */
const createFilteredProductPagesCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const combinations = generateFilterCombinations(products);
  const displayLookup = buildDisplayLookup(products);

  return combinations.map((combo) => ({
    filters: combo.filters,
    path: combo.path,
    count: combo.count,
    products: getProductsByFilters(products, combo.filters),
    filterDescription: buildFilterDescription(combo.filters, displayLookup),
  }));
};

/**
 * Generate redirects for incomplete filter paths (key without value)
 * e.g., /products/search/size/ redirects to /products/search/
 */
const createFilterRedirectsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const allAttributes = getAllFilterAttributes(products);
  const attributeKeys = Object.keys(allAttributes);
  const baseUrl = `/${strings.product_permalink_dir}/search`;

  const redirects = new Set();

  // For each attribute key, create a redirect from /search/key/ to /search/
  for (const key of attributeKeys) {
    redirects.add(JSON.stringify({ from: `${baseUrl}/${key}/`, to: `${baseUrl}/#content` }));
  }

  // For each valid filter combination, create redirects for incomplete paths
  const combinations = generateFilterCombinations(products);
  for (const combo of combinations) {
    const segments = combo.path.split("/");
    // segments are [key1, val1, key2, val2, ...]
    // Create redirect for path + next key (without value)
    for (const key of attributeKeys) {
      if (!combo.filters[key]) {
        const incompletePath = `${baseUrl}/${combo.path}/${key}/`;
        const redirectTo = `${baseUrl}/${combo.path}/#content`;
        redirects.add(JSON.stringify({ from: incompletePath, to: redirectTo }));
      }
    }
  }

  return Array.from(redirects).map((r) => JSON.parse(r));
};

/**
 * Create collection of filter data (attributes + display lookup combined)
 */
const createFilterAttributesCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  return {
    attributes: getAllFilterAttributes(products),
    displayLookup: buildDisplayLookup(products),
  };
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
    "filterRedirects",
    createFilterRedirectsCollection,
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
  eleventyConfig.addFilter("buildFilterUIData", buildFilterUIData);
};

/**
 * Build pre-computed filter UI data for templates
 * @param {Object} filterData - { attributes: {...}, displayLookup: {...} }
 * @param {Object} currentFilters - { size: "compact" } or null/undefined
 * @param {Array} validPages - Array of { path: "..." } objects for pages that exist
 * @returns {Object} Complete UI data ready for simple template loops
 */
const buildFilterUIData = (filterData, currentFilters, validPages) => {
  const allAttributes = filterData.attributes;
  const display = filterData.displayLookup;

  if (Object.keys(allAttributes).length === 0) {
    return { hasFilters: false };
  }

  const validPaths = new Set(validPages.map((p) => p.path));
  const baseUrl = `/${strings.product_permalink_dir}`;
  const filters = currentFilters || {};
  const hasActiveFilters = Object.keys(filters).length > 0;

  // Build active filters with remove URLs
  const activeFilters = Object.entries(filters).map(([key, value]) => {
    const withoutThis = { ...filters };
    delete withoutThis[key];
    const removePath = filterToPath(withoutThis);
    const removeUrl = removePath
      ? `${baseUrl}/search/${removePath}/#content`
      : `${baseUrl}/#content`;

    return {
      key: display[key],
      value: display[value],
      removeUrl,
    };
  });

  // Build filter groups with options (only include options that lead to valid pages)
  const groups = Object.entries(allAttributes)
    .map(([attrName, attrValues]) => {
      const currentValue = filters[attrName];

      const options = attrValues
        .map((value) => {
          const isActive = currentValue === value;
          const newFilters = { ...filters, [attrName]: value };
          const path = filterToPath(newFilters);

          // Only include if this path exists (has products)
          if (!isActive && !validPaths.has(path)) {
            return null;
          }

          const url = `${baseUrl}/search/${path}/#content`;
          return { value: display[value], url, active: isActive };
        })
        .filter(Boolean);

      // Only include group if it has options
      if (options.length === 0) return null;

      return {
        name: attrName,
        label: display[attrName],
        options,
      };
    })
    .filter(Boolean);

  return {
    hasFilters: groups.length > 0,
    hasActiveFilters,
    activeFilters,
    clearAllUrl: `${baseUrl}/#content`,
    groups,
  };
};

export {
  parseFilterAttributes,
  getAllFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  productMatchesFilters,
  getProductsByFilters,
  generateFilterCombinations,
  createFilteredProductPagesCollection,
  createFilterRedirectsCollection,
  createFilterAttributesCollection,
  buildFilterUIData,
  configureProductFilters,
};
