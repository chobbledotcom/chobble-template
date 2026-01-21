/**
 * Functional grouping utilities for building indices and lookups
 */

import { filter, flatMap, pipe, reduce } from "./array.js";
import { fromPairs } from "./object.js";

/**
 * Append item to array at key in Map, creating array if needed
 * Accepts [key, item] pair for direct use with reduce
 * @template K
 * @template V
 * @param {Map<K, V[]>} map - Map to append to
 * @param {[K, V]} pair - Key-value pair
 * @returns {Map<K, V[]>} Updated map
 */
const appendToMap = (map, [key, item]) =>
  map.set(key, [...(map.get(key) || []), item]);

/**
 * Collect [key, value] pairs into a Map, grouping values by key
 * @template K
 * @template V
 * @param {[K, V][]} pairs - Array of [key, value] pairs
 * @returns {Map<K, V[]>} Map from key to array of values
 */
const collectToMap = (pairs) => reduce(appendToMap, new Map())(pairs);

/**
 * Build a reverse index from items to keys (many-to-many relationship)
 *
 * Each item can map to multiple keys via the getKeys function.
 * Returns a Map where each key points to an array of items that have that key.
 *
 * @template T
 * @template K
 * @param {T[]} items - Array of items to index
 * @param {(item: T) => K[]} getKeys - Function that extracts an array of keys from each item
 * @returns {Map<K, T[]>} Map from key to array of items
 *
 * @example
 * // Build category -> products index
 * const index = buildReverseIndex(products, (p) => p.data.categories);
 * const widgetProducts = index.get("widgets") ?? [];
 */
const buildReverseIndex = (items, getKeys) =>
  pipe(
    flatMap((item) => getKeys(item).map((key) => [key, item])),
    collectToMap,
  )(items);

/**
 * Group values by key with deduplication
 *
 * Takes an array of (key, value) pairs and groups unique values by key.
 * Returns a Map where each key points to an array of unique values.
 *
 * @template K
 * @template V
 * @param {[K, V][]} pairs - Array of [key, value] pairs
 * @returns {Map<K, V[]>} Map from key to unique values
 *
 * @example
 * // Group attribute values by attribute name
 * const pairs = [["size", "small"], ["size", "large"], ["size", "small"]];
 * const grouped = groupValuesBy(pairs);
 * // Map { "size" => ["small", "large"] }
 */
const groupValuesBy = (pairs) => {
  const grouped = collectToMap(pairs);
  return new Map([...grouped].map(([k, v]) => [k, [...new Set(v)]]));
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
 * @template T
 * @template V
 * @param {T[]} items - Array of items to process
 * @param {(item: T) => [string, V][]} getPairs - Function that extracts [[key, value], ...] pairs from each item
 * @returns {Record<string, V>} Lookup object with first occurrence of each key
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
 * @template T
 * @template K
 * @param {T[]} items - Array of items to group
 * @param {(item: T) => K | null | undefined} getKey - Function that extracts a single key from each item
 * @returns {Map<K, T[]>} Map from key to array of items
 *
 * @example
 * // Group events by date
 * const byDate = groupBy(events, (e) => e.data.event_date);
 */
const groupBy = (items, getKey) =>
  pipe(
    filter((item) => getKey(item) != null),
    flatMap((item) => [[getKey(item), item]]),
    collectToMap,
  )(items);

export {
  buildReverseIndex,
  groupValuesBy,
  buildFirstOccurrenceLookup,
  groupBy,
};
