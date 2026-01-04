import {
  chunk,
  compact,
  filterMap,
  flatMap,
  join,
  map,
  pipe,
  sort,
} from "#utils/array-utils.js";
import { buildFirstOccurrenceLookup, groupValuesBy } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";
import { everyEntry, mapBoth, mapEntries } from "#utils/object-entries.js";
import { slugify } from "#utils/slug-utils.js";
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
 * Create a Set from an iterable (functional wrapper to avoid linter pattern)
 */
const toSet = (iterable) => new Set(iterable);

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
  const allPairs = items.flatMap((item) =>
    Object.entries(parseFilterAttributes(item.data.filter_attributes)),
  );

  const valuesByKey = groupValuesBy(allPairs);

  const sortedKeys = [...valuesByKey.keys()].sort();
  return Object.fromEntries(
    sortedKeys.map((key) => [key, [...valuesByKey.get(key)].sort()]),
  );
});

/**
 * Extract (slug, display) pairs from an item's filter attributes
 */
const getDisplayPairs = (item) => {
  const attrs = item.data.filter_attributes;
  if (!attrs) return [];

  return attrs.flatMap((attr) => [
    [slugify(attr.name), attr.name],
    [slugify(attr.value), attr.value],
  ]);
};

/**
 * Build a lookup map from slugified keys to original display text
 * Returns: { "size": "Size", "compact": "Compact", "pro": "Pro" }
 * First occurrence wins when there are duplicates
 */
const buildDisplayLookup = memoize((items) =>
  buildFirstOccurrenceLookup(items, getDisplayPairs),
);

/**
 * Convert filter object to URL path segment
 * { size: "small", capacity: "3" } => "capacity/3/size/small"
 * Keys are sorted alphabetically
 */
const filterToPath = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return "";

  return pipe(
    sort((a, b) => a.localeCompare(b)),
    flatMap((key) => [
      encodeURIComponent(key),
      encodeURIComponent(filters[key]),
    ]),
    join("/"),
  )(Object.keys(filters));
};

/**
 * Group array elements into pairs: [a, b, c, d] => [[a, b], [c, d]]
 */
const toPairs = (arr) => chunk(arr, 2);

/**
 * Parse URL path back to filter object
 * "capacity/3/size/small" => { capacity: "3", size: "small" }
 */
const pathToFilter = (path) => {
  if (!path) return {};

  return pipe(
    (s) => s.split("/"),
    compact,
    toPairs,
    map(([key, value]) => [decodeURIComponent(key), decodeURIComponent(value)]),
    Object.fromEntries,
  )(path);
};

/**
 * Check if an item matches the given filters
 * Uses normalized comparison (lowercase, no special chars/spaces)
 */
const matchesNormalized = (itemAttrs) =>
  everyEntry(
    (key, value) => normalize(itemAttrs[key] || "") === normalize(value),
  );

const itemMatchesFilters = (item, filters) => {
  if (!filters || Object.keys(filters).length === 0) return true;

  const itemAttrs = parseFilterAttributes(item.data.filter_attributes);
  return matchesNormalized(itemAttrs)(filters);
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
const normalizeAttrs = mapBoth(normalize);

const buildItemAttributeMap = (items) => {
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
  everyEntry((key, value) => itemAttrs[key] === value)(normalizedFilters);

/**
 * Count items matching filters using pre-built attribute map
 */
const countMatchingItems = (items, itemAttrMap, filters) => {
  const normalized = normalizeAttrs(filters);
  return items.filter((item) => attrsMatch(itemAttrMap.get(item), normalized))
    .length;
};

/**
 * Generate all filter combinations that have matching items
 * Returns array of { filters: {...}, path: "...", count: N }
 *
 * No duplicate tracking needed: we process keys in order and only
 * recurse to later keys, so each path is generated exactly once.
 */
const generateFilterCombinations = memoize((items) => {
  if (!items) return [];

  const allAttributes = getAllFilterAttributes(items);
  const attributeKeys = Object.keys(allAttributes);

  if (attributeKeys.length === 0) return [];

  const itemAttrMap = buildItemAttributeMap(items);

  // Count items matching these filters
  const countMatches = (filters) =>
    countMatchingItems(items, itemAttrMap, filters);

  // Create a combo result object
  const toCombo = (filters, count) => ({
    filters,
    path: filterToPath(filters),
    count,
  });

  // Try one filter value: skip if no matches, else include with children
  const tryValue =
    (recurse, keyIndex, baseFilters) => (results, value, key) => {
      const filters = { ...baseFilters, [key]: value };
      const count = countMatches(filters);

      if (count === 0) return results;

      const childResults = recurse(filters, keyIndex + 1);
      return [...results, toCombo(filters, count), ...childResults];
    };

  // Process all values for one attribute key
  const processKey = (recurse, baseFilters, keyIndex) => (results, key) =>
    allAttributes[key].reduce(
      (acc, value) => tryValue(recurse, keyIndex, baseFilters)(acc, value, key),
      results,
    );

  // Generate all combinations starting from given filters and key index
  const generateFrom = (baseFilters, startIndex) =>
    attributeKeys
      .slice(startIndex)
      .reduce(
        (results, key, offset) =>
          processKey(
            generateFrom,
            baseFilters,
            startIndex + offset,
          )(results, key),
        [],
      );

  return generateFrom({}, 0);
});

/**
 * Build a filter description string from filters using display lookup
 * { size: "compact", type: "pro" } => "Size: compact, Type: pro"
 */
const toDisplayPair = (displayLookup) => (key, value) =>
  `${displayLookup[key]}: <strong>${displayLookup[value]}</strong>`;

const buildFilterDescription = (filters, displayLookup) =>
  mapEntries(toDisplayPair(displayLookup))(filters).join(", ");

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

  const validPaths = toSet(validPages.map((p) => p.path));
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

    const toRedirect = (basePath, key) => ({
      from: `${searchUrl}${basePath}/${key}/`,
      to: `${searchUrl}${basePath}/#content`,
    });

    const simpleRedirects = map((key) => toRedirect("", key))(attrKeys);

    const comboRedirects = pipe(
      flatMap((combo) =>
        filterMap(
          (key) => !combo.filters[key],
          (key) => toRedirect(`/${combo.path}`, key),
        )(attrKeys),
      ),
    )(generateFilterCombinations(items));

    return [...simpleRedirects, ...comboRedirects];
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
