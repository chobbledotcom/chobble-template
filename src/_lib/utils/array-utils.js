/**
 * Functional array utilities
 */

/**
 * Split an array into groups of a specified size
 *
 * Incomplete groups at the end are dropped (strict chunking).
 * For example, chunk([1,2,3,4,5], 2) returns [[1,2], [3,4]] - the 5 is dropped.
 *
 * @param {Array} arr - Array to split
 * @param {number} size - Size of each chunk
 * @returns {Array[]} Array of chunks
 *
 * @example
 * chunk([1, 2, 3, 4], 2)     // [[1, 2], [3, 4]]
 * chunk(['a', 'b', 'c'], 2)  // [['a', 'b']]
 * chunk([1, 2, 3, 4, 5], 3)  // [[1, 2, 3]]
 */
const chunk = (arr, size) =>
  Array.from({ length: Math.floor(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

/**
 * Create a picker function for the specified keys (curried form)
 *
 * Returns a function that extracts only the specified keys from an object.
 * This curried form works perfectly with map(): arr.map(pick(['a', 'b']))
 *
 * @param {string[]} keys - Keys to include
 * @returns {Function} (obj) => picked object
 *
 * @example
 * pick(['a', 'c'])({ a: 1, b: 2, c: 3 })  // { a: 1, c: 3 }
 * users.map(pick(['name', 'age']))        // picks name & age from each
 */
const pick = (keys) => (obj) =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

/**
 * Map an array of objects, keeping only the specified keys from each
 *
 * Equivalent to: arr.map(pick(keys))
 *
 * @param {Object[]} arr - Array of objects
 * @param {string[]} keys - Keys to include in each object
 * @returns {Object[]} Array of objects with only the specified keys
 *
 * @example
 * const users = [{ name: 'Jo', age: 25, id: 1 }, { name: 'Sam', age: 30, id: 2 }];
 * pickMap(users, ['name', 'age'])  // [{ name: 'Jo', age: 25 }, { name: 'Sam', age: 30 }]
 */
const pickMap = (arr, keys) => arr.map(pick(keys));

export { chunk, pick, pickMap };
