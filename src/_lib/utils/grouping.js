/**
 * Functional grouping utilities for building indices and lookups
 */

import { fromPairs } from "#utils/object-entries.js";

/**
 * Build a reverse index from items to keys (many-to-many relationship)
 *
 * Each item can map to multiple keys via the getKeys function.
 * Returns a Map where each key points to an array of items that have that key.
 *
 * @param {Array} items - Array of items to index
 * @param {Function} getKeys - Function that extracts an array of keys from each item
 * @returns {Map} Map<key, items[]>
 *
 * @example
 * // Build category -> products index
 * const index = buildReverseIndex(products, (p) => p.data.categories || []);
 * const widgetProducts = index.get("widgets") || [];
 */
const buildReverseIndex = (items, getKeys) => {
  const index = new Map();

  for (const item of items) {
    for (const key of getKeys(item)) {
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key).push(item);
    }
  }

  return index;
};

/**
 * Group values by key with deduplication
 *
 * Takes an array of (key, value) pairs and groups unique values by key.
 * Returns a Map where each key points to a Set of unique values.
 *
 * @param {Array} pairs - Array of [key, value] pairs
 * @returns {Map} Map<key, Set<value>>
 *
 * @example
 * // Group attribute values by attribute name
 * const pairs = [["size", "small"], ["size", "large"], ["size", "small"]];
 * const grouped = groupValuesBy(pairs);
 * // Map { "size" => Set { "small", "large" } }
 */
const groupValuesBy = (pairs) => {
  const groups = new Map();

  for (const [key, value] of pairs) {
    if (!groups.has(key)) {
      groups.set(key, new Set());
    }
    groups.get(key).add(value);
  }

  return groups;
};

/**
 * Build a first-occurrence-wins lookup from items
 *
 * Extracts (key, value) pairs from items and builds a lookup object
 * where only the first occurrence of each key is kept.
 *
 * Uses reverse + fromPairs: reversing makes the first occurrence end up
 * last, so it overwrites any later occurrences when building the object.
 *
 * @param {Array} items - Array of items to process
 * @param {Function} getPairs - Function that extracts [[key, value], ...] pairs from each item
 * @returns {Object} { key: value, ... }
 *
 * @example
 * // Build slug -> display text lookup
 * const lookup = buildFirstOccurrenceLookup(items, (item) =>
 *   item.attrs.flatMap(a => [[slugify(a.name), a.name], [slugify(a.value), a.value]])
 * );
 */
const buildFirstOccurrenceLookup = (items, getPairs) =>
  fromPairs(items.flatMap(getPairs).reverse());

/**
 * Group items by a single key (one-to-many relationship)
 *
 * Each item maps to exactly one key. Simpler version of buildReverseIndex
 * for when items don't have multiple keys.
 *
 * @param {Array} items - Array of items to group
 * @param {Function} getKey - Function that extracts a single key from each item
 * @returns {Map} Map<key, items[]>
 *
 * @example
 * // Group events by date
 * const byDate = groupBy(events, (e) => e.data.event_date);
 */
const groupBy = (items, getKey) => {
  const groups = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (key !== undefined && key !== null) {
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    }
  }

  return groups;
};

/**
 * Create a lookup helper for a reverse index
 *
 * Returns a function that safely retrieves items by key, returning empty array
 * if key not found. Useful for creating filter functions.
 *
 * @param {Map} index - The reverse index map
 * @returns {Function} (key) => items[]
 *
 * @example
 * const index = buildReverseIndex(products, getCategories);
 * const lookup = createLookup(index);
 * const widgets = lookup("widgets"); // Returns [] if not found
 */
const createLookup = (index) => (key) => index.get(key) || [];

export {
  buildReverseIndex,
  groupValuesBy,
  buildFirstOccurrenceLookup,
  groupBy,
  createLookup,
};
