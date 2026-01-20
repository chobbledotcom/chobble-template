/**
 * Generic filtering library for items with filter_attributes.
 *
 * Used by both products and properties to provide URL-based filtering.
 *
 * Key functions:
 * - createFilterConfig(): Factory that creates Eleventy collections/filters
 * - generateFilterCombinations(): Pre-computes all valid filter combinations
 * - getItemsByFilters(): Returns items matching filter criteria
 * - buildFilterUIData(): Generates data for filter UI templates
 *
 * URL format: /products/search/size/small/color/red/ (keys sorted alphabetically)
 */
import {
  compact,
  filterMap,
  flatMap,
  join,
  map,
  pipe,
  sort,
} from "#toolkit/fp/array.js";
import {
  buildFirstOccurrenceLookup,
  groupValuesBy,
} from "#toolkit/fp/grouping.js";
import { memoize, withWeakMapCache } from "#toolkit/fp/memoize.js";
import { mapBoth, mapEntries, omit, toObject } from "#toolkit/fp/object.js";
import { compareStrings } from "#toolkit/fp/sorting.js";
import { slugify } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").FilterAttribute} FilterAttribute */
/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */
/** @typedef {import("#lib/types").FilterSet} FilterSet */
/** @typedef {import("#lib/types").FilterCombination} FilterCombination */
/** @typedef {import("#lib/types").FilterAttributeData} FilterAttributeData */
/** @typedef {import("#lib/types").FilterUIData} FilterUIData */
/** @typedef {import("#lib/types").FilterConfigOptions} FilterConfigOptions */

/**
 * Normalize a string for comparison: lowercase, strip spaces and special chars
 * Memoized since the same attribute names/values are processed many times.
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
const normalize = memoize(
  (str) => str.toLowerCase().replace(/[^a-z0-9]/g, ""),
  { cacheKey: (args) => args[0] },
);

/**
 * Parse filter attributes from item data (inner implementation).
 * Uses WeakMap caching since the same filter_attributes array is processed
 * multiple times per item across different operations.
 *
 * @param {FilterAttribute[]} filterAttributes - Raw filter attributes array
 * @returns {FilterSet} Parsed filter object
 */
const parseFilterAttributesInner = withWeakMapCache((filterAttributes) =>
  toObject(filterAttributes, (attr) => [
    slugify(attr.name),
    slugify(attr.value),
  ]),
);

/**
 * Parse filter attributes from item data
 * Expects format: [{name: "Size", value: "small"}, {name: "Capacity", value: "3"}]
 * Returns: { size: "small", capacity: "3" }
 *
 * @param {FilterAttribute[] | undefined} filterAttributes - Raw filter attributes
 * @returns {FilterSet} Parsed filter object
 */
const parseFilterAttributes = (filterAttributes) =>
  filterAttributes ? parseFilterAttributesInner(filterAttributes) : {};

/**
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 * Uses pipe to show data flow: extract pairs -> group by key -> format for output
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {Record<string, string[]>} Attribute names to possible values
 */
const getAllFilterAttributes = memoize((items) => {
  const valuesByKey = pipe(
    flatMap((item) =>
      Object.entries(parseFilterAttributes(item.data.filter_attributes)),
    ),
    groupValuesBy,
  )(items);

  const sortedKeys = [...valuesByKey.keys()].sort();
  return Object.fromEntries(
    sortedKeys.map((key) => [key, [...valuesByKey.get(key)].sort()]),
  );
});

/**
 * Extract (slug, display) pairs from an item's filter attributes
 *
 * @param {EleventyCollectionItem} item - Collection item
 * @returns {[string, string][]} Array of [slug, displayText] pairs
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
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {Record<string, string>} Slug to display text lookup
 */
const buildDisplayLookup = memoize((items) =>
  buildFirstOccurrenceLookup(items, getDisplayPairs),
);

/**
 * Convert filter object to URL path segment
 * { size: "small", capacity: "3" } => "capacity/3/size/small"
 * Keys are sorted alphabetically
 * @param {FilterSet | null | undefined} filters - Filter object
 * @returns {string} URL path segment
 */
const filterToPath = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return "";

  return pipe(
    sort(compareStrings),
    flatMap((key) => [
      encodeURIComponent(key),
      encodeURIComponent(filters[key]),
    ]),
    join("/"),
  )(Object.keys(filters));
};

/**
 * Get items matching the given filters
 * Uses normalized comparison (lowercase, no special chars/spaces)
 *
 * Leverages the memoized buildItemLookup for O(1) lookups instead of
 * O(n) filtering on each call.
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @param {FilterSet} filters - Non-empty filter object
 * @returns {EleventyCollectionItem[]} Filtered items
 */
const getItemsByFilters = (items, filters) =>
  getItemsWithLookup(items, filters, buildItemLookup(items));

const normalizeAttrs = mapBoth(normalize);

/**
 * Add a single item's attributes to the lookup table (mutates lookup in place).
 * Helper for buildItemLookup's reduce.
 */
const addItemToLookup = (lookup, item, position) => {
  const attrs = normalizeAttrs(
    parseFilterAttributes(item.data.filter_attributes),
  );

  for (const [key, value] of Object.entries(attrs)) {
    lookup[key] ??= {};
    lookup[key][value] ??= new Set();
    lookup[key][value].add(position);
  }

  return lookup;
};

/**
 * Build a lookup table: filter key → filter value → Set of item positions.
 * Example: { color: { red: Set([0, 2]), blue: Set([1]) }, size: { large: Set([0, 1]) } }
 *
 * Memoized per items array reference since the same items are processed
 * multiple times (once in generateFilterCombinations, again in getItemsByFilters).
 *
 * @param {EleventyCollectionItem[]} items - Items to index
 * @returns {Object} Lookup table for fast filtering
 */
const buildItemLookup = withWeakMapCache((items) =>
  items.reduce(addItemToLookup, {}),
);

/**
 * Find item positions that match ALL the given filters.
 *
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @param {FilterSet} filters - Filters to match (already normalized)
 * @returns {number[]} Positions of matching items
 */
const findMatchingPositions = (lookup, filters) => {
  const filterEntries = Object.entries(filters);
  const [firstKey, firstValue] = filterEntries[0];
  const candidates = [...lookup[firstKey][firstValue]];

  // Keep only candidates that match ALL other filters
  return candidates.filter((pos) =>
    filterEntries.slice(1).every(([key, value]) => lookup[key][value].has(pos)),
  );
};

/**
 * Count items matching the given filters.
 *
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @param {FilterSet} filters - Filters to match (already normalized)
 * @param {number} totalItems - Total item count (returned when no filters)
 * @returns {number} Number of matching items
 */
const countMatches = (lookup, filters, totalItems) =>
  Object.keys(filters).length === 0
    ? totalItems
    : findMatchingPositions(lookup, filters).length;

/**
 * Get items matching the given filters using a pre-built lookup.
 *
 * @param {EleventyCollectionItem[]} items - Original items array
 * @param {FilterSet} filters - Filters to apply
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @returns {EleventyCollectionItem[]} Matching items, sorted
 */
const getItemsWithLookup = (items, filters, lookup) => {
  const normalized = normalizeAttrs(filters);
  const positions = findMatchingPositions(lookup, normalized);
  return positions.map((pos) => items[pos]).sort(sortItems);
};

/**
 * Try adding a filter and return all valid combinations that include it.
 */
const tryFilter = (state, currentFilters, key, value, nextKeyIndex) => {
  const filters = { ...currentFilters, [key]: value };
  const count = countMatches(
    state.lookup,
    normalizeAttrs(filters),
    state.itemCount,
  );

  if (count === 0) return [];

  const combo = { filters, path: filterToPath(filters), count };
  return [combo, ...buildCombosFrom(state, filters, nextKeyIndex)];
};

/**
 * Build all valid filter combinations starting from a given attribute key.
 */
const buildCombosFrom = (state, currentFilters, startKeyIndex) =>
  state.keys
    .slice(startKeyIndex)
    .flatMap((key, offset) =>
      state.values[key].flatMap((value) =>
        tryFilter(
          state,
          currentFilters,
          key,
          value,
          startKeyIndex + offset + 1,
        ),
      ),
    );

/**
 * Generate all filter combinations that have matching items.
 * Returns: [{ filters: { color: "red" }, path: "color/red", count: 5 }, ...]
 *
 * @param {EleventyCollectionItem[]} items - Items to generate combinations for
 * @returns {FilterCombination[]} All valid filter combinations
 */
const generateFilterCombinations = memoize((items) => {
  const values = getAllFilterAttributes(items);
  const keys = Object.keys(values);

  if (keys.length === 0) return [];

  const state = {
    values,
    keys,
    lookup: buildItemLookup(items),
    itemCount: items.length,
  };

  return buildCombosFrom(state, {}, 0);
});

/**
 * Build filter description parts from filters using display lookup
 * Returns structured data for template rendering
 * { size: "compact", type: "pro" } => [{ key: "Size", value: "compact" }, ...]
 * @param {FilterSet} filters - Current filters
 * @param {Record<string, string>} displayLookup - Slug to display text lookup
 * @returns {{ key: string, value: string }[]} Filter description parts
 */
const buildFilterDescription = (filters, displayLookup) =>
  mapEntries((key, value) => ({
    key: displayLookup[key],
    value: displayLookup[value],
  }))(filters);

/**
 * Add filterUI to each page object (mutates pages in place)
 * @param {Array} pages - Page objects to enhance
 * @param {Object} filterData - { attributes, displayLookup }
 * @param {string} baseUrl - Base URL for filter links
 */
const addFilterUIToPages = (pages, filterData, baseUrl) => {
  for (const page of pages) {
    page.filterUI = buildFilterUIData(filterData, page.filters, pages, baseUrl);
  }
};

/**
 * Build base page object from a filter combination
 * @param {Object} combo - { filters, path, count }
 * @param {Array} matchedItems - Items matching the filters
 * @param {Object} displayLookup - Display text lookup
 * @returns {Object} Base page properties
 */
const buildFilterPageBase = (combo, matchedItems, displayLookup) => ({
  filters: combo.filters,
  path: combo.path,
  count: combo.count,
  items: matchedItems,
  filterDescription: buildFilterDescription(combo.filters, displayLookup),
});

/**
 * Build active filter data for the UI
 * @param {FilterSet} filters - Current filters
 * @param {Record<string, string>} display - Display lookup
 * @param {string} baseUrl - Base URL
 * @returns {Array} Active filter objects with removeUrl
 */
const buildActiveFilters = (filters, display, baseUrl) =>
  mapEntries((key, value) => {
    const removePath = filterToPath(omit([key])(filters));
    return {
      key: display[key],
      value: display[value],
      removeUrl: removePath
        ? `${baseUrl}/search/${removePath}/#content`
        : `${baseUrl}/#content`,
    };
  })(filters);

/**
 * Build filter option from a value
 * @param {Object} ctx - Context with filters, validPathLookup, display, baseUrl
 * @param {string} attrName - Attribute name
 * @param {string} value - Option value
 * @returns {Object|null} Option object or null if invalid
 */
const buildFilterOption = (ctx, attrName, value) => {
  const { filters, validPathLookup, display, baseUrl } = ctx;
  const isActive = filters[attrName] === value;
  const path = filterToPath({ ...filters, [attrName]: value });

  if (!isActive && !validPathLookup[path]) return null;

  return {
    value: display[value],
    url: `${baseUrl}/search/${path}/#content`,
    active: isActive,
  };
};

/**
 * Build filter group from attribute
 * @param {Object} ctx - Context object
 * @param {string} attrName - Attribute name
 * @param {string[]} attrValues - Attribute values
 * @returns {Object|null} Group object or null if no valid options
 */
const buildFilterGroup = (ctx, attrName, attrValues) => {
  const options = compact(
    attrValues.map((value) => buildFilterOption(ctx, attrName, value)),
  );
  if (options.length === 0) return null;

  return {
    name: attrName,
    label: ctx.display[attrName],
    options,
  };
};

/**
 * Build pre-computed filter UI data for templates
 * @param {FilterAttributeData} filterData - Filter attribute data
 * @param {FilterSet | null | undefined} currentFilters - Current active filters
 * @param {{ path: string }[]} validPages - Array of valid page paths
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
const buildFilterUIData = (filterData, currentFilters, validPages, baseUrl) => {
  const allAttributes = filterData.attributes;
  const display = filterData.displayLookup;

  if (Object.keys(allAttributes).length === 0) {
    return { hasFilters: false };
  }

  // Use lookup object for O(1) path lookups instead of O(n) array includes
  const validPathLookup = toObject(validPages, (p) => [p.path, true]);
  const filters = currentFilters || {};
  const hasActiveFilters = Object.keys(filters).length > 0;
  const ctx = { filters, validPathLookup, display, baseUrl };

  const groups = compact(
    Object.entries(allAttributes).map(([attrName, attrValues]) =>
      buildFilterGroup(ctx, attrName, attrValues),
    ),
  );

  return {
    hasFilters: groups.length > 0,
    hasActiveFilters,
    activeFilters: buildActiveFilters(filters, display, baseUrl),
    clearAllUrl: `${baseUrl}/#content`,
    groups,
  };
};

/**
 * Generate filter redirects for invalid filter paths.
 * Shared logic used by both global and category-scoped filters.
 * @param {EleventyCollectionItem[]} items - Items to generate redirects for
 * @param {string} searchUrl - Base search URL (e.g., "/products/search" or "/categories/widgets/search")
 * @returns {Array} Redirect objects { from, to }
 */
const generateFilterRedirects = (items, searchUrl) => {
  const attrKeys = Object.keys(getAllFilterAttributes(items));
  if (attrKeys.length === 0) return [];

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

/**
 * Create a filter system for a specific item type
 * @param {FilterConfigOptions} options - Configuration options
 * @returns {{ configure: (eleventyConfig: import("@11ty/eleventy").UserConfig) => void }} Filter configuration
 */
const createFilterConfig = (options) => {
  const { tag, permalinkDir, itemsKey, collections, uiDataFilterName } =
    options;
  const baseUrl = `/${permalinkDir}`;

  /**
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const pagesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    const combinations = generateFilterCombinations(items);
    const displayLookup = buildDisplayLookup(items);
    const filterData = {
      attributes: getAllFilterAttributes(items),
      displayLookup,
    };

    const pages = combinations.map((combo) => {
      const matchedItems = getItemsByFilters(items, combo.filters);
      return {
        ...buildFilterPageBase(combo, matchedItems, displayLookup),
        [itemsKey]: matchedItems,
      };
    });

    addFilterUIToPages(pages, filterData, baseUrl);
    return pages;
  };

  /**
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const redirectsCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    return generateFilterRedirects(items, `${baseUrl}/search`);
  };

  /**
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const attributesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    return {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
  };

  /**
   * Build filterUI for listing page (no active filters)
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const listingFilterUICollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    const filterData = {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
    const pages = pagesCollection(collectionApi);
    return buildFilterUIData(filterData, null, pages, baseUrl);
  };

  const configure = (eleventyConfig) => {
    eleventyConfig.addCollection(collections.pages, pagesCollection);
    eleventyConfig.addCollection(collections.redirects, redirectsCollection);
    eleventyConfig.addCollection(collections.attributes, attributesCollection);
    eleventyConfig.addCollection(
      `${collections.pages}ListingFilterUI`,
      listingFilterUICollection,
    );
    eleventyConfig.addFilter(uiDataFilterName, (filterData, filters, pages) =>
      buildFilterUIData(filterData, filters, pages, baseUrl),
    );
  };

  return { configure };
};

export {
  createFilterConfig,
  // Used by category-product-filters.js for category-scoped filtering
  addFilterUIToPages,
  buildDisplayLookup,
  buildFilterPageBase,
  buildFilterUIData,
  buildItemLookup,
  generateFilterCombinations,
  generateFilterRedirects,
  getAllFilterAttributes,
  getItemsByFilters,
  getItemsWithLookup,
};
