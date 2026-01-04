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
 * Remove falsy values from an array
 *
 * Filters out null, undefined, false, 0, '', and NaN.
 * Perfect for building arrays with conditional elements.
 *
 * @param {Array} arr - Array potentially containing falsy values
 * @returns {Array} Array with only truthy values
 *
 * @example
 * compact([1, null, 2, undefined, 3])        // [1, 2, 3]
 * compact(['a', false && 'b', 'c'])          // ['a', 'c']
 * compact([condition && 'value', 'always']) // conditionally includes 'value'
 */
const compact = (arr) => arr.filter(Boolean);

export { chunk, compact, pick };
