/**
 * Sorting utilities - comparators and sort helpers
 */

/**
 * Comparator for sorting strings alphabetically using locale-aware comparison.
 * Use directly with sort() for string arrays.
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Comparison result
 *
 * @example
 * ['banana', 'apple', 'cherry'].sort(compareStrings)  // ['apple', 'banana', 'cherry']
 * pipe(sort(compareStrings))(names)
 */
const compareStrings = (a, b) => a.localeCompare(b);

/**
 * Compare two string keys using locale comparison.
 * @param {string} keyA
 * @param {string} keyB
 * @returns {number}
 */
const compareStringKeys = (keyA, keyB) => keyA.localeCompare(keyB);

/**
 * Compare two number keys using subtraction.
 * @param {number} keyA
 * @param {number} keyB
 * @returns {number}
 */
const compareNumberKeys = (keyA, keyB) => keyA - keyB;

/**
 * Create a comparator from a key-extraction function.
 * Auto-detects type: uses localeCompare for strings, subtraction for numbers.
 *
 * @template T
 * @param {(item: T) => string | number} getKey - Function to extract a value
 * @returns {(a: T, b: T) => number} Comparator function
 *
 * @example
 * // Strings - uses localeCompare automatically
 * const byName = compareBy(user => user.name);
 * users.sort(byName);
 *
 * @example
 * // Numbers - uses subtraction automatically
 * const byAge = compareBy(user => user.age);
 * users.sort(byAge);
 *
 * @example
 * // With pipe and sort from array-utils
 * pipe(sort(compareBy(x => x.title)))(items)
 */
const compareBy = (getKey) => (a, b) => {
  const keyA = getKey(a);
  const keyB = getKey(b);
  return typeof keyA === "string"
    ? compareStringKeys(keyA, keyB)
    : compareNumberKeys(keyA, keyB);
};

/**
 * Reverse a comparator (flip ascending to descending or vice versa).
 *
 * @template T
 * @param {(a: T, b: T) => number} comparator - Comparator to reverse
 * @returns {(a: T, b: T) => number} Reversed comparator
 *
 * @example
 * const byAgeDesc = descending(compareBy(user => user.age));
 */
const descending = (comparator) => (a, b) => comparator(b, a);

/**
 * Factory function to create a comparator that sorts by numeric value first,
 * then by string value as a secondary sort key.
 * @template T
 * @param {(item: T) => number} getNumeric - Function to extract numeric value from item
 * @param {(item: T) => string} getString - Function to extract string value from item
 * @returns {(a: T, b: T) => number} Comparator function for use with Array.sort()
 */
const orderThenString = (getNumeric, getString) => (a, b) => {
  const diff = getNumeric(a) - getNumeric(b);
  return diff !== 0 ? diff : compareBy(getString)(a, b);
};

export { compareBy, compareStrings, descending, orderThenString };
