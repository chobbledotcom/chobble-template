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
import { memoize } from "#toolkit/fp/memoize.js";
import { mapBoth, mapEntries } from "#toolkit/fp/object.js";
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
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Parse filter attributes from item data
 * Expects format: [{name: "Size", value: "small"}, {name: "Capacity", value: "3"}]
 * Returns: { size: "small", capacity: "3" }
 *
 * @param {FilterAttribute[] | undefined} filterAttributes - Raw filter attributes
 * @returns {FilterSet} Parsed filter object
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
 * Only called from generateFilterCombinations with non-empty filters.
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @param {FilterSet} filters - Non-empty filter object
 * @returns {EleventyCollectionItem[]} Filtered items
 */
const getItemsByFilters = (items, filters) => {
  const preNormalizedFilterEntries = Object.entries(filters).map(
    ([key, value]) => [key, normalize(value)],
  );

  const matchesFilters = (item) => {
    const itemAttrs = parseFilterAttributes(item.data.filter_attributes);
    for (const [key, normalizedValue] of preNormalizedFilterEntries) {
      if (normalize(itemAttrs[key] || "") !== normalizedValue) return false;
    }
    return true;
  };

  return items.filter(matchesFilters).sort(sortItems);
};

const normalizeAttrs = mapBoth(normalize);

/**
 * Add an item to the inverted index for all its attributes.
 * @param {Object} index - The index to update
 * @param {number} itemIndex - Index of the item
 * @param {FilterSet} normalizedAttrs - Normalized attributes
 */
const addToIndex = (index, itemIndex, normalizedAttrs) => {
  for (const [key, value] of Object.entries(normalizedAttrs)) {
    if (!index[key]) index[key] = {};
    if (!index[key][value]) index[key][value] = new Set();
    index[key][value].add(itemIndex);
  }
};

/**
 * Build an inverted index for fast set-intersection-based counting.
 * Returns: { attrName: { attrValue: Set<itemIndex> } }
 *
 * This enables O(filters) counting per combination instead of O(items × filters).
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {{ index: Object, itemCount: number }} Inverted index and item count
 */
const buildInvertedIndex = (items) => {
  const index = {};
  for (let i = 0; i < items.length; i++) {
    const attrs = parseFilterAttributes(items[i].data.filter_attributes);
    addToIndex(index, i, normalizeAttrs(attrs));
  }
  return { index, itemCount: items.length };
};

/**
 * Check if an item matches all filter criteria beyond the first.
 * @param {Object} index - Inverted index
 * @param {number} idx - Item index to check
 * @param {[string, string][]} entries - Filter entries (skip first)
 * @returns {boolean} True if item matches all criteria
 */
const matchesRemainingFilters = (index, idx, entries) => {
  for (let i = 1; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (!index[key]?.[value]?.has(idx)) return false;
  }
  return true;
};

/**
 * Count matching items using set intersection on inverted index.
 * Much faster than iterating all items for each combination.
 *
 * @param {{ index: Object, itemCount: number }} invertedIndex
 * @param {FilterSet} filters - Normalized filter criteria
 * @returns {number} Count of matching items
 */
const countMatchesWithIndex = (invertedIndex, filters) => {
  const entries = Object.entries(filters);
  if (entries.length === 0) return invertedIndex.itemCount;

  const [firstKey, firstValue] = entries[0];
  const firstSet = invertedIndex.index[firstKey]?.[firstValue];
  if (!firstSet) return 0;

  let count = 0;
  for (const idx of firstSet) {
    if (matchesRemainingFilters(invertedIndex.index, idx, entries)) count++;
  }
  return count;
};

/**
 * Try adding a filter value and recurse if it has matches.
 * @param {Object} ctx - Generation context
 * @param {FilterSet} baseFilters - Current filter combination
 * @param {string} key - Attribute key
 * @param {string} value - Attribute value
 * @param {number} nextIndex - Next attribute index for recursion
 */
const tryFilterValue = (ctx, baseFilters, key, value, nextIndex) => {
  const filters = { ...baseFilters, [key]: value };
  const normalized = normalizeAttrs(filters);
  const count = countMatchesWithIndex(ctx.invertedIndex, normalized);

  if (count > 0) {
    ctx.results.push({ filters, path: filterToPath(filters), count });
    generateCombosFrom(ctx, filters, nextIndex);
  }
};

/**
 * Generate combinations from a starting index.
 * @param {Object} ctx - Generation context
 * @param {FilterSet} baseFilters - Current filter combination
 * @param {number} startIndex - Starting attribute index
 */
const generateCombosFrom = (ctx, baseFilters, startIndex) => {
  for (let i = startIndex; i < ctx.attributeKeys.length; i++) {
    const key = ctx.attributeKeys[i];
    for (const value of ctx.allAttributes[key]) {
      tryFilterValue(ctx, baseFilters, key, value, i + 1);
    }
  }
};

/**
 * Generate all filter combinations that have matching items
 * Returns array of { filters: {...}, path: "...", count: N }
 *
 * Optimizations:
 * - Uses inverted index for O(1) set-intersection counting instead of O(n) iteration
 * - Uses push-based accumulation instead of O(n²) spread accumulation
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {FilterCombination[]} All valid filter combinations
 */
const generateFilterCombinations = memoize((items) => {
  const allAttributes = getAllFilterAttributes(items);
  const attributeKeys = Object.keys(allAttributes);
  if (attributeKeys.length === 0) return [];

  const ctx = {
    allAttributes,
    attributeKeys,
    invertedIndex: buildInvertedIndex(items),
    results: [],
  };

  generateCombosFrom(ctx, {}, 0);
  return ctx.results;
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

  const validPaths = validPages.map((p) => p.path);
  const filters = currentFilters || {};
  const hasActiveFilters = Object.keys(filters).length > 0;

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

  const groups = Object.entries(allAttributes)
    .map(([attrName, attrValues]) => {
      const currentValue = filters[attrName];

      const options = attrValues
        .map((value) => {
          const isActive = currentValue === value;
          const newFilters = { ...filters, [attrName]: value };
          const path = filterToPath(newFilters);

          if (!isActive && !validPaths.includes(path)) {
            return null;
          }

          const url = `${baseUrl}/search/${path}/#content`;
          return { value: display[value], url, active: isActive };
        })
        .filter(Boolean);

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
  generateFilterCombinations,
  generateFilterRedirects,
  getAllFilterAttributes,
  getItemsByFilters,
};
