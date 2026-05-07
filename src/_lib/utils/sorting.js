/**
 * Sorting utilities - Eleventy-specific comparators and sort helpers.
 *
 * For generic sorting utilities (compareBy, compareStrings, descending,
 * orderThenString), import directly from "#toolkit/fp/sorting.js".
 */
import { orderThenString } from "#toolkit/fp/sorting.js";

// Eleventy-specific comparators (not in toolkit)

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

/**
 * @typedef {Object} NavigationItemData
 * @property {number} [order]
 * @property {string} name
 * @property {{ order?: number, key?: string }} eleventyNavigation
 */

/**
 * @typedef {Object} NavigationItem
 * @property {NavigationItemData} data
 */

/**
 * Comparator for sorting navigation items by order then by key.
 * Falls back to title when eleventyNavigation.key is not set.
 * @type {(a: NavigationItem, b: NavigationItem) => number}
 */
const sortNavigationItems = orderThenString(
  (item) => item.data.eleventyNavigation.order ?? 999,
  (item) => item.data.eleventyNavigation.key || item.data.name,
);

export { sortByDateDescending, sortItems, sortNavigationItems };
