/**
 * Functional array utilities
 */

/**
 * Left-to-right function composition
 *
 * Passes a value through a sequence of functions, where each function
 * receives the result of the previous one.
 *
 * @param {...Function} fns - Functions to compose
 * @returns {Function} (value) => transformed value
 *
 * @example
 * pipe(addOne, double, toString)(5)  // "12"
 * pipe(filter(isEven), map(square), sum)(numbers)
 */
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);

/**
 * Curried array helpers for use with pipe()
 *
 * @example
 * pipe(
 *   filter(x => x > 0),
 *   map(x => x * 2),
 *   sort((a, b) => a - b)
 * )(numbers)
 */
const filter = (predicate) => (arr) => arr.filter(predicate);
const map = (fn) => (arr) => arr.map(fn);
const flatMap = (fn) => (arr) => arr.flatMap(fn);
const sort = (comparator) => (arr) => [...arr].sort(comparator);
const unique = (arr) => [...new Set(arr)];
const join = (separator) => (arr) => arr.join(separator);

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

/**
 * Get the separator for an item in a list formatted with "and"
 *
 * Returns ", " for most items, " and " for second-to-last, "" for last.
 * Curried: call with length first, then index.
 *
 * @param {number} length - Total length of the list
 * @returns {Function} (index) => separator string
 *
 * @example
 * const sep = listSeparator(3);
 * sep(0)  // ", "
 * sep(1)  // " and "
 * sep(2)  // ""
 */
const listSeparator = (length) => (index) =>
  index >= length - 1 ? "" : index === length - 2 ? " and " : ", ";

/**
 * Find the first duplicate item in an array
 *
 * Returns the first item whose key matches a previous item's key.
 * Returns undefined if no duplicates exist.
 *
 * Uses pure functional approach with no mutable state.
 *
 * @param {Array} items - Array to check for duplicates
 * @param {Function} getKey - Optional key extractor (defaults to identity)
 * @returns {*} First duplicate item, or undefined
 *
 * @example
 * findDuplicate([1, 2, 1])                              // 1
 * findDuplicate([{id: 1}, {id: 2}, {id: 1}], x => x.id) // {id: 1} (at index 2)
 * findDuplicate([1, 2, 3])                              // undefined
 */
const findDuplicate = (items, getKey = (x) => x) => {
  const keys = items.map(getKey);
  return items.find((_, i) => keys.indexOf(keys[i]) !== i);
};

export {
  chunk,
  compact,
  filter,
  findDuplicate,
  flatMap,
  join,
  listSeparator,
  map,
  pick,
  pipe,
  sort,
  unique,
};
