import { frozenSet } from "#toolkit/fp/set.js";

const SORT_COMPARATORS = {
  default: (a, b) => a.originalIndex - b.originalIndex,
  "price-asc": (a, b) => a.data.price - b.data.price,
  "price-desc": (a, b) => b.data.price - a.data.price,
  "name-asc": (a, b) => a.data.title.localeCompare(b.data.title),
  "name-desc": (a, b) => b.data.title.localeCompare(a.data.title),
};

const applyFiltersAndSort = (
  allItems,
  itemsList,
  activeFilters,
  activeSortKey,
) => {
  const filterEntries = Object.entries(activeFilters);
  const matched = allItems.filter((item) =>
    filterEntries.every(([key, value]) => item.data.filters[key] === value),
  );
  const comparator =
    SORT_COMPARATORS[activeSortKey] || SORT_COMPARATORS.default;
  matched.sort(comparator);
  const matchedSet = frozenSet(matched);

  for (const item of allItems) {
    item.element.style.display = matchedSet.has(item) ? "" : "none";
  }

  if (itemsList) {
    for (const item of matched) {
      itemsList.append(item.element);
    }
  }

  return matched.length;
};

/**
 * Check if a single item matches a set of filters.
 * @param {{ data: { filters: Record<string, string> } }} item
 * @param {Record<string, string>} filters
 * @returns {boolean}
 */
const itemMatchesFilters = (item, filters) => {
  const entries = Object.entries(filters);
  return entries.every(([key, value]) => item.data.filters[key] === value);
};

export { applyFiltersAndSort, itemMatchesFilters };
