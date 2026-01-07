/**
 * Factory function to create a comparator that sorts by numeric value first,
 * then by string value as a secondary sort key.
 * @param {(item: any) => number} getNumeric - Function to extract numeric value from item
 * @param {(item: any) => string} getString - Function to extract string value from item
 * @returns {(a: any, b: any) => number} Comparator function for use with Array.sort()
 */
const createOrderThenStringComparator = (getNumeric, getString) => (a, b) => {
  const diff = getNumeric(a) - getNumeric(b);
  return diff !== 0 ? diff : getString(a).localeCompare(getString(b));
};

/**
 * Comparator for sorting by order then by title/name.
 * Default behavior assumes items have item.data.order and item.data.title/name.
 * @type {(a: any, b: any) => number}
 */
const sortItems = createOrderThenStringComparator(
  (item) => item.data?.order ?? 0,
  (item) => item.data?.title || item.data?.name || "",
);

/**
 * Comparator for sorting by date descending (newest first).
 * Assumes items have a .date property.
 */
const sortByDateDescending = (a, b) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

/**
 * Comparator for sorting navigation items by order then by key.
 * Assumes items have item.data.eleventyNavigation with order property,
 * and fallback to item.data.title for the secondary sort.
 */
const sortNavigationItems = createOrderThenStringComparator(
  (item) => item.data.eleventyNavigation.order ?? 999,
  (item) => item.data.eleventyNavigation.key || item.data.title || "",
);

export { sortItems, sortByDateDescending, sortNavigationItems };
