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

export { chunk };
