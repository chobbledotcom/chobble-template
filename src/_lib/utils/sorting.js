/**
 * Sorting utilities - Eleventy-specific comparators and sort helpers.
 *
 * For generic sorting utilities (compareBy, descending, orderThenString),
 * import directly from "#utils/fp/sorting.js".
 */
import { orderThenString } from "#utils/fp/sorting.js";

// Eleventy-specific comparators (the generic ones live in fp/sorting.js)

/**
 * @typedef {Object} CollectionItemData
 * @property {number} [order] - Sort order
 * @property {string} [name] - Item name
 * @property {{ order?: number, key?: string }} [eleventyNavigation] - Navigation data
 */

/**
 * @typedef {Object} CollectionItem
 * @property {CollectionItemData} data - Item data from frontmatter
 * @property {Date} [date] - Item date
 */

/** Comparator for sorting collection items by order then by name. */
const sortItems = orderThenString(
  (item) => item.data.order,
  (item) => item.data.name,
);

/**
 * @typedef {Object} DateItem
 * @property {Date | string | undefined} [date] - Item date (optional, items without dates sort to end)
 */

/**
 * Comparator for sorting by date descending (newest first).
 * Items without dates are sorted to the end.
 * @type {(a: DateItem, b: DateItem) => number}
 */
const sortByDateDescending = (a, b) => {
  const aTime = a.date ? new Date(a.date).getTime() : 0;
  const bTime = b.date ? new Date(b.date).getTime() : 0;
  return bTime - aTime;
};

export { sortByDateDescending, sortItems };
