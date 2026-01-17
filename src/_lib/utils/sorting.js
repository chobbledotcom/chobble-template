/**
 * @typedef {Object} CollectionItemData
 * @property {number} [order] - Sort order
 * @property {string} [title] - Item title
 * @property {string} [name] - Item name (fallback)
 * @property {{ order?: number, key?: string }} [eleventyNavigation] - Navigation data
 */

/**
 * @typedef {Object} CollectionItem
 * @property {CollectionItemData} data - Item data from frontmatter
 * @property {Date} [date] - Item date
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
    ? keyA.localeCompare(/** @type {string} */ (keyB))
    : /** @type {number} */ (keyA) - /** @type {number} */ (keyB);
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
const createOrderThenStringComparator = (getNumeric, getString) => (a, b) => {
  const diff = getNumeric(a) - getNumeric(b);
  return diff !== 0 ? diff : compareBy(getString)(a, b);
};

/**
 * Comparator for sorting collection items by order then by title/name.
 * All Eleventy collection items always have a data property.
 * @type {(a: CollectionItem, b: CollectionItem) => number}
 */
const sortItems = createOrderThenStringComparator(
  (item) => item.data.order ?? 0,
  (item) => item.data.title || item.data.name || "",
);

/**
 * @typedef {Object} DateItem
 * @property {Date | string} date - Item date
 */

/**
 * Comparator for sorting by date descending (newest first).
 * Assumes items have a .date property.
 * @type {(a: DateItem, b: DateItem) => number}
 */
const sortByDateDescending = (a, b) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

/**
 * Comparator for sorting navigation items by order then by key.
 * Assumes items have item.data.eleventyNavigation with order property,
 * and fallback to item.data.title for the secondary sort.
 * @type {(a: CollectionItem, b: CollectionItem) => number}
 */
const sortNavigationItems = createOrderThenStringComparator(
  (item) => item.data.eleventyNavigation.order ?? 999,
  (item) => item.data.eleventyNavigation.key || item.data.title || "",
);

export {
  compareBy,
  compareStrings,
  descending,
  sortByDateDescending,
  sortItems,
  sortNavigationItems,
};
