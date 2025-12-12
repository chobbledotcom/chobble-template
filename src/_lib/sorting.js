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

export { sortByOrderThenTitle };
