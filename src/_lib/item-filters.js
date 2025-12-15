import { sortByOrderThenTitle } from "./sorting.js";

/**
 * Generic filtering library for items with filter_attributes
 * Used by both products and properties
 */

/**
 * Normalize a string for comparison: lowercase, strip spaces and special chars
 */
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Parse filter attributes from item data
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
const getAllFilterAttributes = (items) => {
  const attributeMap = {};

  for (const item of items) {
    const attrs = parseFilterAttributes(item.data.filter_attributes);
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
const buildDisplayLookup = (items) => {
  const lookup = {};

  for (const item of items) {
    const filterAttrs = item.data.filter_attributes;
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
 * Check if an item matches the given filters
 * Uses normalized comparison (lowercase, no special chars/spaces)
 */
const itemMatchesFilters = (item, filters) => {
  if (!filters || Object.keys(filters).length === 0) return true;

  const itemAttrs = parseFilterAttributes(item.data.filter_attributes);

  for (const [key, value] of Object.entries(filters)) {
    if (normalize(itemAttrs[key] || "") !== normalize(value)) {
      return false;
    }
  }
  return true;
};

/**
 * Get items matching the given filters
 */
const getItemsByFilters = (items, filters) => {
  if (!items) return [];
  if (!filters || Object.keys(filters).length === 0) {
    return items.slice().sort(sortByOrderThenTitle);
  }

  return items
    .filter((item) => itemMatchesFilters(item, filters))
    .sort(sortByOrderThenTitle);
};

/**
 * Generate all filter combinations that have matching items
 * Returns array of { filters: {...}, path: "...", count: N }
 */
const generateFilterCombinations = (items) => {
  if (!items) return [];

  const allAttributes = getAllFilterAttributes(items);
  const attributeKeys = Object.keys(allAttributes);

  if (attributeKeys.length === 0) return [];

  const combinations = [];
  const seen = new Set();

  // Generate all filter combinations recursively
  const generateCombos = (currentFilters, startKeyIndex) => {
    for (let i = startKeyIndex; i < attributeKeys.length; i++) {
      const key = attributeKeys[i];
      for (const value of allAttributes[key]) {
        const newFilters = { ...currentFilters, [key]: value };
        const path = filterToPath(newFilters);

        if (!seen.has(path)) {
          const matchingItems = getItemsByFilters(items, newFilters);
          if (matchingItems.length > 0) {
            seen.add(path);
            combinations.push({
              filters: newFilters,
              path,
              count: matchingItems.length,
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
 * Build pre-computed filter UI data for templates
 * @param {Object} filterData - { attributes: {...}, displayLookup: {...} }
 * @param {Object} currentFilters - { size: "compact" } or null/undefined
 * @param {Array} validPages - Array of { path: "..." } objects for pages that exist
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @returns {Object} Complete UI data ready for simple template loops
 */
const buildFilterUIData = (filterData, currentFilters, validPages, baseUrl) => {
  const allAttributes = filterData.attributes;
  const display = filterData.displayLookup;

  if (Object.keys(allAttributes).length === 0) {
    return { hasFilters: false };
  }

  const validPaths = new Set(validPages.map((p) => p.path));
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

          // Only include if this path exists (has items)
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

/**
 * Create a factory for item-type-specific filter configuration
 * @param {Object} options - Configuration options
 * @param {string} options.tag - The tag used to identify items (e.g., "product", "property")
 * @param {string} options.permalinkDir - The permalink directory (e.g., "products", "properties")
 * @param {string} options.collectionPrefix - Prefix for collection names (e.g., "filteredProduct", "filteredProperty")
 * @param {string} options.itemName - Singular name for the item type (e.g., "product", "property")
 */
const createFilterConfig = (options) => {
  const { tag, permalinkDir, collectionPrefix, itemName } = options;

  const createFilteredPagesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const combinations = generateFilterCombinations(items);
    const displayLookup = buildDisplayLookup(items);

    return combinations.map((combo) => ({
      filters: combo.filters,
      path: combo.path,
      count: combo.count,
      items: getItemsByFilters(items, combo.filters),
      filterDescription: buildFilterDescription(combo.filters, displayLookup),
    }));
  };

  const createRedirectsCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const allAttributes = getAllFilterAttributes(items);
    const attributeKeys = Object.keys(allAttributes);
    const baseUrl = `/${permalinkDir}/search`;

    const redirects = new Set();

    // For each attribute key, create a redirect from /search/key/ to /search/
    for (const key of attributeKeys) {
      redirects.add(
        JSON.stringify({ from: `${baseUrl}/${key}/`, to: `${baseUrl}/#content` }),
      );
    }

    // For each valid filter combination, create redirects for incomplete paths
    const combinations = generateFilterCombinations(items);
    for (const combo of combinations) {
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

  const createAttributesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    return {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
  };

  const configure = (eleventyConfig) => {
    eleventyConfig.addCollection(
      `${collectionPrefix}Pages`,
      createFilteredPagesCollection,
    );

    eleventyConfig.addCollection(
      `${collectionPrefix}Redirects`,
      createRedirectsCollection,
    );

    eleventyConfig.addCollection(
      `${collectionPrefix}Attributes`,
      createAttributesCollection,
    );
  };

  return {
    createFilteredPagesCollection,
    createRedirectsCollection,
    createAttributesCollection,
    configure,
    tag,
    permalinkDir,
    collectionPrefix,
    itemName,
  };
};

export {
  normalize,
  parseFilterAttributes,
  getAllFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  itemMatchesFilters,
  getItemsByFilters,
  generateFilterCombinations,
  buildFilterDescription,
  buildFilterUIData,
  createFilterConfig,
};
