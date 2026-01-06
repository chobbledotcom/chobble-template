/**
 * Comparator for sorting by order then by title/name.
 * Default behavior assumes items have item.data.order and item.data.title/name.
 */
const sortItems = (a, b) => {
  const orderA = a.data?.order ?? 0;
  const orderB = b.data?.order ?? 0;

  const orderDiff = orderA - orderB;
  if (orderDiff !== 0) return orderDiff;

  const titleA = a.data?.title || a.data?.name || "";
  const titleB = b.data?.title || b.data?.name || "";
  return titleA.localeCompare(titleB);
};

/**
 * Comparator for sorting by date descending (newest first).
 * Assumes items have a .date property.
 */
const sortByDateDescending = (a, b) => new Date(b.date) - new Date(a.date);

/**
 * Get the most recent items from an array, sorted by date descending.
 */
const getLatestItems = (items, limit = 3) =>
  (items || []).sort(sortByDateDescending).slice(0, limit);

/**
 * Comparator for sorting navigation items by order then by key.
 * Assumes items have item.data.eleventyNavigation with order property,
 * and fallback to item.data.title for the secondary sort.
 */
const sortNavigationItems = (a, b) => {
  const orderA = a.data.eleventyNavigation.order ?? 999;
  const orderB = b.data.eleventyNavigation.order ?? 999;

  const orderDiff = orderA - orderB;
  if (orderDiff !== 0) return orderDiff;

  const keyA = a.data.eleventyNavigation.key || a.data.title || "";
  const keyB = b.data.eleventyNavigation.key || b.data.title || "";
  return keyA.localeCompare(keyB);
};

export { sortItems, sortByDateDescending, getLatestItems, sortNavigationItems };
