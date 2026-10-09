/**
 * Functional grouping utilities for building indices and lookups
 */

import { flatMap, pipe, reduce } from "#utils/fp/array.js";

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
 * Curried collector: turn items into [key, item] pairs, then group them
 * into a Map.
 * @template T
 * @template K
 * @param {(item: T) => Iterable<[K, T]>} toPairs - Pair extraction function
 * @returns {(items: T[]) => Map<K, T[]>} Grouping function
 */
const collectBy = (toPairs) =>
  pipe(
    flatMap((item) => [...toPairs(item)]),
    collectToMap,
  );

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
  collectBy((item) => getKeys(item).map((key) => [key, item]))(items);

export { buildReverseIndex };
