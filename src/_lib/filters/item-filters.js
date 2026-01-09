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
 * Parse filter attributes from item data
 * Expects format: [{name: "Size", value: "small"}, {name: "Capacity", value: "3"}]
 * Returns: { size: "small", capacity: "3" }
 *
 * @param {import("#lib/types").FilterAttribute[]|undefined} filterAttributes
 * @returns {Object}
 */
const parseFilterAttributes = (filterAttributes) => {
  if (!filterAttributes) return {};

  return Object.fromEntries(
    filterAttributes.map((attr) => [slugify(attr.name), slugify(attr.value)]),
  );
};

/**
 * Format a Map of values by key into a sorted object
 * { key => Set(values) } => { key: [sorted_values], ... }
 * Curried for composition
 */
const formatValueMap = (valuesByKey) =>
  pipe(
    (map) => [...map.keys()].sort(),
    map((key) => [key, [...valuesByKey.get(key)].sort()]),
    Object.fromEntries,
  )(valuesByKey);

/**
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 * Uses pipe to show data flow: extract pairs -> group by key -> format for output
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} items
 * @returns {Object}
 */
const getAllFilterAttributes = memoize((items) => {
  const valuesByKey = pipe(
    flatMap((item) =>
      Object.entries(parseFilterAttributes(item.data.filter_attributes)),
    ),
    groupValuesBy,
  )(items);

  return formatValueMap(valuesByKey);
});

/**
 * Extract (slug, display) pairs from an item's filter attributes
 *
 * @param {import("#lib/types").EleventyCollectionItem} item
 * @returns {[string, any][]}
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
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} items
 * @returns {Object}
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
 * Parse URL path back to filter object
 * "capacity/3/size/small" => { capacity: "3", size: "small" }
 */
const pathToFilter = (path) => {
  if (!path) return {};

  return pipe(
    (s) => s.split("/"),
    compact,
    (arr) => chunk(arr, 2),
    map(([key, value]) => [decodeURIComponent(key), decodeURIComponent(value)]),
    Object.fromEntries,
  )(path);
};

/**
 * Get items matching the given filters
 * Uses normalized comparison (lowercase, no special chars/spaces)
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} items
 * @param {Object} filters
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const getItemsByFilters = (items, filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    return items.slice().sort(sortItems);
  }

  // Pre-normalize filter values once, not per-item
  const normalizedFilters = Object.entries(filters).map(([key, value]) => [
    key,
    normalize(value),
  ]);

  const matchesFilters = (item) => {
    const itemAttrs = parseFilterAttributes(item.data.filter_attributes);
    for (const [key, normalizedValue] of normalizedFilters) {
      if (normalize(itemAttrs[key] || "") !== normalizedValue) return false;
    }
    return true;
  };

  return items.filter(matchesFilters).sort(sortItems);
};

const normalizeAttrs = mapBoth(normalize);

/**
 * Build a map of normalized filter attributes for all items (for fast lookups)
 * Returns: Map<item, { size: "small", capacity: "3" }>
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} items
 * @returns {Map}
 */
const buildItemAttributeMap = (items) => {
  return new Map(
    items.map((item) => {
      const attrs = parseFilterAttributes(item.data.filter_attributes);
      return [item, normalizeAttrs(attrs)];
    }),
  );
};

/**
 * Generate all filter combinations that have matching items
 * Returns array of { filters: {...}, path: "...", count: N }
 *
 * No duplicate tracking needed: we process keys in order and only
 * recurse to later keys, so each path is generated exactly once.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} items
 * @returns {Array}
 */
const generateFilterCombinations = memoize((items) => {
  const allAttributes = getAllFilterAttributes(items);
  const attributeKeys = Object.keys(allAttributes);

  if (attributeKeys.length === 0) return [];

  const itemAttrMap = buildItemAttributeMap(items);

  // Count items matching these filters
  const countMatches = (filters) => {
    const normalized = normalizeAttrs(filters);
    return items.filter((item) =>
      everyEntry((key, value) => itemAttrMap.get(item)[key] === value)(
        normalized,
      ),
    ).length;
  };

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
 * Build filter description parts from filters using display lookup
 * Returns structured data for template rendering
 * { size: "compact", type: "pro" } => [{ key: "Size", value: "compact" }, ...]
 * @param {Object} filters - Filter object with slugified keys and values
 * @param {Object} displayLookup - Lookup map from slugs to display text
 * @returns {Array<{key: string, value: string}>} Array of display key-value pairs
 */
const buildFilterDescription = (filters, displayLookup) =>
  mapEntries((key, value) => ({
    key: displayLookup[key],
    value: displayLookup[value],
  }))(filters);

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

  const validPaths = validPages.map((p) => p.path);
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
          if (!isActive && !validPaths.includes(path)) {
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
  getItemsByFilters,
  generateFilterCombinations,
  buildFilterDescription,
  buildFilterUIData,
  createFilterConfig,
};
