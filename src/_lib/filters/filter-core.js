/**
 * Core filter parsing and lookup utilities.
 *
 * Low-level functions for:
 * - Normalizing strings for comparison
 * - Parsing filter attributes from items
 * - Building lookup tables for O(1) filtering
 * - Converting filters to URL paths
 * - Sorting filtered results
 */

import { flatMap, join, pipe, sort } from "#toolkit/fp/array.js";
import {
  buildFirstOccurrenceLookup,
  groupValuesBy,
} from "#toolkit/fp/grouping.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";
import { mapBoth, toObject } from "#toolkit/fp/object.js";
import { compareBy, compareStrings, descending } from "#toolkit/fp/sorting.js";
import { slugify } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").FilterAttribute} FilterAttribute */
/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */
/** @typedef {import("#lib/types").FilterSet} FilterSet */

/**
 * Normalize a string for comparison: lowercase, strip spaces and special chars
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Parse filter attributes from item data (inner implementation).
 * Uses WeakMap caching since the same filter_attributes array is processed
 * multiple times per item across different operations.
 *
 * @param {FilterAttribute[]} filterAttributes - Raw filter attributes array
 * @returns {FilterSet} Parsed filter object
 */
const parseFilterAttributesInner = memoizeByRef((filterAttributes) =>
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
export const parseFilterAttributes = (filterAttributes) =>
  filterAttributes ? parseFilterAttributesInner(filterAttributes) : {};

/**
 * Convert filter object to URL path segment
 * { size: "small", capacity: "3" } => "capacity/3/size/small"
 * Keys are sorted alphabetically
 * @param {FilterSet | null | undefined} filters - Filter object
 * @returns {string} URL path segment
 */
export const filterToPath = (filters) => {
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
 * Build a map of all filter attributes and their possible values
 * Returns: { size: ["small", "medium", "large"], capacity: ["1", "2", "3"] }
 * Uses pipe to show data flow: extract pairs -> group by key -> format for output
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {Record<string, string[]>} Attribute names to possible values
 */
export const getAllFilterAttributes = memoizeByRef((items) => {
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
 * Build a lookup map from slugified keys to original display text
 * Returns: { "size": "Size", "compact": "Compact", "pro": "Pro" }
 * First occurrence wins when there are duplicates
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {Record<string, string>} Slug to display text lookup
 */
export const buildDisplayLookup = memoizeByRef((items) =>
  buildFirstOccurrenceLookup(items, (item) => {
    if (!item.data.filter_attributes) return [];
    return item.data.filter_attributes.flatMap((attr) => [
      [slugify(attr.name), attr.name],
      [slugify(attr.value), attr.value],
    ]);
  }),
);

/** Normalize both keys and values of a filter object */
export const normalizeAttrs = mapBoth(
  /** @param {string} s */ (s) => normalize(s),
);

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
export const buildItemLookup = memoizeByRef((items) =>
  items.reduce((lookup, item, position) => {
    const attrs = normalizeAttrs(
      parseFilterAttributes(item.data.filter_attributes),
    );
    for (const [key, value] of Object.entries(attrs)) {
      lookup[key] ??= {};
      lookup[key][value] ??= new Set();
      lookup[key][value].add(position);
    }
    return lookup;
  }, {}),
);

/**
 * Find item positions that match ALL the given filters.
 *
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @param {FilterSet} filters - Filters to match (already normalized)
 * @returns {number[]} Positions of matching items
 */
export const findMatchingPositions = (lookup, filters) => {
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
export const countMatches = (lookup, filters, totalItems) =>
  Object.keys(filters).length === 0
    ? totalItems
    : findMatchingPositions(lookup, filters).length;

// ============================================================================
// Sort Options
// ============================================================================

/** @param {EleventyCollectionItem} item */
const getName = (item) =>
  (item.data.title || item.data.name || "").toLowerCase();

/**
 * Available sort options with display label and comparator.
 * Keys (except "default") are appended to filter URLs (e.g., /size/small/price-asc/)
 */
export const SORT_OPTIONS = [
  { key: "default", label: "Default", compare: sortItems },
  {
    key: "price-asc",
    label: "Price: Low to High",
    compare: compareBy((item) => item.data.price ?? Number.MAX_VALUE),
  },
  {
    key: "price-desc",
    label: "Price: High to Low",
    compare: descending(
      compareBy((item) => item.data.price ?? Number.MIN_VALUE),
    ),
  },
  { key: "name-asc", label: "Name: A-Z", compare: compareBy(getName) },
  {
    key: "name-desc",
    label: "Name: Z-A",
    compare: descending(compareBy(getName)),
  },
];

/**
 * Get the sort comparator for a given sort key
 * @param {string | undefined} sortKey - Sort option key
 * @returns {(a: EleventyCollectionItem, b: EleventyCollectionItem) => number} Comparator function
 */
export const getSortComparator = (sortKey) =>
  SORT_OPTIONS.find((o) => o.key === sortKey)?.compare || sortItems;

/**
 * Convert filter object and optional sort to URL path segment.
 * { size: "small", capacity: "3" }, "price-asc" => "capacity/3/size/small/price-asc"
 * Keys are sorted alphabetically, sort suffix is appended at the end.
 *
 * @param {FilterSet | null | undefined} filters - Filter object
 * @param {string | undefined} sortKey - Sort option key (if not "default")
 * @returns {string} URL path segment
 */
export const toSortedPath = (filters, sortKey) => {
  const suffix = sortKey && sortKey !== "default" ? sortKey : "";
  return [filterToPath(filters), suffix].filter(Boolean).join("/");
};

/**
 * Get items that match a set of filters (without sorting).
 *
 * Results are cached per items array and filter path. When the same filter
 * set is used with different sort orders (e.g. "price-asc", "name-desc"),
 * the expensive item-matching work only happens once. With 13,000 filter
 * combinations × 5 sort options = 65,000 pages, this avoids ~52,000
 * redundant scans.
 *
 * The WeakMap is keyed by the items array reference, so each product set
 * (e.g. "all products" vs "products in category X") gets its own cache,
 * and the cache is automatically cleaned up when the items array is
 * garbage collected.
 *
 * @param {EleventyCollectionItem[]} items - All items
 * @param {FilterSet} filters - Filter object (can be empty)
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @returns {EleventyCollectionItem[]} Matching items (unsorted)
 */
const alreadyMatchedItems = new WeakMap();

export const getMatchingItems = (items, filters, lookup) => {
  if (!filters || Object.keys(filters).length === 0) return items;

  if (!alreadyMatchedItems.has(items)) {
    alreadyMatchedItems.set(items, new Map());
  }
  const cache = alreadyMatchedItems.get(items);

  const path = filterToPath(filters);
  const cached = cache.get(path);
  if (cached) return cached;

  const matched = findMatchingPositions(lookup, normalizeAttrs(filters)).map(
    (pos) => items[pos],
  );

  cache.set(path, matched);
  return matched;
};

/**
 * Get items matching the given filters, then sort them.
 *
 * @param {EleventyCollectionItem[]} items - All items
 * @param {FilterSet} filters - Filters to apply (can be empty)
 * @param {Object} lookup - Lookup table from buildItemLookup
 * @param {string | undefined} sortKey - Sort option key
 * @returns {EleventyCollectionItem[]} Matching items, sorted
 */
export const matchWithSort = (items, filters, lookup, sortKey) =>
  sort(getSortComparator(sortKey))(getMatchingItems(items, filters, lookup));

/**
 * Get items matching the given filters with specified sort order.
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @param {FilterSet} filters - Filter object (can be empty for sort-only)
 * @param {string | undefined} sortKey - Sort option key
 * @returns {EleventyCollectionItem[]} Filtered and sorted items
 */
export const filterWithSort = (items, filters, sortKey) =>
  matchWithSort(items, filters, buildItemLookup(items), sortKey);
