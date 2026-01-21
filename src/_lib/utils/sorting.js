/**
 * Sorting utilities - comparators and sort helpers
 *
 * Re-exports from @chobble/js-toolkit for backward compatibility.
 * New code should import directly from "#toolkit/fp/index.js"
 *
 * Note: sortItems, sortByDateDescending, and sortNavigationItems are
 * Eleventy-specific and remain in this file.
 */
export {
  compareBy,
  compareStrings,
  descending,
  orderThenString,
} from "#toolkit/fp/sorting.js";

// Import for use in Eleventy-specific comparators below
import { orderThenString } from "#toolkit/fp/sorting.js";

// Eleventy-specific comparators (not in toolkit)

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
 * Comparator for sorting collection items by order then by title/name.
 * All Eleventy collection items always have a data property.
 * @type {(a: CollectionItem, b: CollectionItem) => number}
 */
const sortItems = orderThenString(
  (item) => item.data.order ?? 0,
  (item) => item.data.title || item.data.name || "",
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
 * Comparator for sorting navigation items by order then by key.
 * Assumes items have item.data.eleventyNavigation with order property,
 * and fallback to item.data.title for the secondary sort.
 * @type {(a: CollectionItem, b: CollectionItem) => number}
 */
const sortNavigationItems = orderThenString(
  (item) => item.data.eleventyNavigation.order ?? 999,
  (item) => item.data.eleventyNavigation.key || item.data.title || "",
);

export { sortByDateDescending, sortItems, sortNavigationItems };
