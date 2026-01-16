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
 * Create a comparator from a key-extraction function.
 * Returns a comparator that sorts by the extracted numeric values (ascending).
 *
 * @template T
 * @param {(item: T) => number} getKey - Function to extract a numeric value
 * @returns {(a: T, b: T) => number} Comparator function
 *
 * @example
 * const byAge = compareBy(user => user.age);
 * users.sort(byAge);
 *
 * @example
 * const byDate = compareBy(event => new Date(event.date).getTime());
 * events.sort(byDate);
 */
const compareBy = (getKey) => (a, b) => getKey(a) - getKey(b);

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
  return diff !== 0 ? diff : getString(a).localeCompare(getString(b));
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
  descending,
  sortByDateDescending,
  sortItems,
  sortNavigationItems,
};
