import slugify from "@sindresorhus/slugify";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

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

  return Object.fromEntries(
    filterAttributes.map((attr) => [slugify(attr.name), slugify(attr.value)]),
  );
};

/**
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 */
const getAllFilterAttributes = memoize((items) => {
  // Step 1: Parse attributes from each item
  const allAttrs = items.map((item) =>
    parseFilterAttributes(item.data.filter_attributes),
  );

  // Step 2: Flatten to [key, value] pairs
  const allPairs = allAttrs.flatMap((attrs) => Object.entries(attrs));

  // Step 3: Group values by key using Sets to dedupe
  const valuesByKey = new Map();
  for (const [key, value] of allPairs) {
    if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
    valuesByKey.get(key).add(value);
  }

  // Step 4: Convert to sorted object with sorted arrays
  const sortedKeys = [...valuesByKey.keys()].sort();
  return Object.fromEntries(
    sortedKeys.map((key) => [key, [...valuesByKey.get(key)].sort()]),
  );
});

/**
 * Build a lookup map from slugified keys to original display text
 * Returns: { "size": "Size", "compact": "Compact", "pro": "Pro" }
 * First occurrence wins when there are duplicates
 */
const buildDisplayLookup = memoize((items) => {
  const lookup = {};

  for (const item of items) {
    const attrs = item.data.filter_attributes;
    if (!attrs) continue;

    for (const attr of attrs) {
      const slugName = slugify(attr.name);
      const slugValue = slugify(attr.value);

      // First occurrence wins
      if (!(slugName in lookup)) lookup[slugName] = attr.name;
      if (!(slugValue in lookup)) lookup[slugValue] = attr.value;
    }
  }

  return lookup;
});

/**
 * Convert filter object to URL path segment
 * { size: "small", capacity: "3" } => "capacity/3/size/small"
 * Keys are sorted alphabetically
 */
const filterToPath = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return "";

  return Object.keys(filters)
    .sort()
    .flatMap((key) => [
      encodeURIComponent(key),
      encodeURIComponent(filters[key]),
    ])
    .join("/");
};

/**
 * Group array elements into pairs: [a, b, c, d] => [[a, b], [c, d]]
 */
const toPairs = (arr) => {
  const pairs = [];
  for (let i = 0; i + 1 < arr.length; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }
  return pairs;
};

/**
 * Parse URL path back to filter object
 * "capacity/3/size/small" => { capacity: "3", size: "small" }
 */
const pathToFilter = (path) => {
  if (!path) return {};

  const segments = path.split("/").filter(Boolean);
  const pairs = toPairs(segments);

  return Object.fromEntries(
    pairs.map(([key, value]) => [
      decodeURIComponent(key),
      decodeURIComponent(value),
    ]),
  );
};

/**
 * Check if an item matches the given filters
 * Uses normalized comparison (lowercase, no special chars/spaces)
 */
const itemMatchesFilters = (item, filters) => {
  if (!filters || Object.keys(filters).length === 0) return true;

  const itemAttrs = parseFilterAttributes(item.data.filter_attributes);

  return Object.entries(filters).every(
    ([key, value]) => normalize(itemAttrs[key] || "") === normalize(value),
  );
};

/**
 * Get items matching the given filters
 */
const getItemsByFilters = (items, filters) => {
  if (!items) return [];
  if (!filters || Object.keys(filters).length === 0) {
    return items.slice().sort(sortItems);
  }

  return items
    .filter((item) => itemMatchesFilters(item, filters))
    .sort(sortItems);
};

/**
 * Build a map of normalized filter attributes for all items (for fast lookups)
 * Returns: Map<item, { size: "small", capacity: "3" }>
 */
const buildItemAttributeMap = (items) => {
  const normalizeAttrs = (attrs) =>
    Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [normalize(k), normalize(v)]),
    );

  return new Map(
    items.map((item) => {
      const attrs = parseFilterAttributes(item.data.filter_attributes);
      return [item, normalizeAttrs(attrs)];
    }),
  );
};

/**
 * Check if an item matches filters using pre-normalized attributes
 * Expects itemAttrs to already be normalized
 */
const attrsMatch = (itemAttrs, normalizedFilters) =>
  Object.entries(normalizedFilters).every(
    ([key, value]) => itemAttrs[key] === value,
  );

/**
 * Normalize filter keys and values for comparison
 */
const normalizeFilters = (filters) =>
  Object.fromEntries(
    Object.entries(filters).map(([k, v]) => [normalize(k), normalize(v)]),
  );

/**
 * Count items matching filters using pre-built attribute map
 */
const countMatchingItems = (items, itemAttrMap, filters) => {
  const normalizedFilters = normalizeFilters(filters);
  return items.filter((item) =>
    attrsMatch(itemAttrMap.get(item), normalizedFilters),
  ).length;
};

/**
 * Generate all filter combinations that have matching items
 * Returns array of { filters: {...}, path: "...", count: N }
 */
const generateFilterCombinations = memoize((items) => {
  if (!items) return [];

  const allAttributes = getAllFilterAttributes(items);
  const attributeKeys = Object.keys(allAttributes);

  if (attributeKeys.length === 0) return [];

  // Pre-build attribute map for all items (single pass)
  const itemAttrMap = buildItemAttributeMap(items);

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
          const matchCount = countMatchingItems(items, itemAttrMap, newFilters);
          if (matchCount > 0) {
            seen.add(path);
            combinations.push({
              filters: newFilters,
              path,
              count: matchCount,
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
});

/**
 * Build a filter description string from filters using display lookup
 * { size: "compact", type: "pro" } => "Size: compact, Type: pro"
 */
const buildFilterDescription = (filters, displayLookup) => {
  return Object.entries(filters)
    .map(
      ([key, value]) =>
        `${displayLookup[key]}: <strong>${displayLookup[value]}</strong>`,
    )
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
 * Create a filter system for a specific item type
 */
const createFilterConfig = (options) => {
  const { tag, permalinkDir, itemsKey, collections, uiDataFilterName } =
    options;
  const baseUrl = `/${permalinkDir}`;

  const pagesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const combinations = generateFilterCombinations(items);
    const displayLookup = buildDisplayLookup(items);

    return combinations.map((combo) => {
      const matchedItems = getItemsByFilters(items, combo.filters);
      return {
        filters: combo.filters,
        path: combo.path,
        count: combo.count,
        items: matchedItems,
        [itemsKey]: matchedItems,
        filterDescription: buildFilterDescription(combo.filters, displayLookup),
      };
    });
  };

  const redirectsCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const attrKeys = Object.keys(getAllFilterAttributes(items));
    const searchUrl = `${baseUrl}/search`;
    const redirects = {};

    for (const key of attrKeys) {
      redirects[`${searchUrl}/${key}/`] = `${searchUrl}/#content`;
    }

    for (const combo of generateFilterCombinations(items)) {
      for (const key of attrKeys) {
        if (!combo.filters[key]) {
          redirects[`${searchUrl}/${combo.path}/${key}/`] =
            `${searchUrl}/${combo.path}/#content`;
        }
      }
    }

    return Object.entries(redirects).map(([from, to]) => ({ from, to }));
  };

  const attributesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    return {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
  };

  const configure = (eleventyConfig) => {
    eleventyConfig.addCollection(collections.pages, pagesCollection);
    eleventyConfig.addCollection(collections.redirects, redirectsCollection);
    eleventyConfig.addCollection(collections.attributes, attributesCollection);
    eleventyConfig.addFilter(uiDataFilterName, (filterData, filters, pages) =>
      buildFilterUIData(filterData, filters, pages, baseUrl),
    );
  };

  return { configure };
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
