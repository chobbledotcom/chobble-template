/**
 * Comparator for sorting by order then by title/name.
 * Default behavior assumes items have item.data.order and item.data.title/name.
 */
const sortByOrderThenTitle = (a, b) => {
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

export { sortByOrderThenTitle, sortByDateDescending, getLatestItems };
