/**
 * Filter UI building utilities.
 *
 * Functions for building filter UI data structures for templates:
 * - Active filter pills with remove URLs
 * - Filter groups with options
 * - Sort group with options
 * - Filter descriptions for headings
 *
 * Performance note: buildPathLookup should be called once per category/item-type,
 * then passed to buildUIWithLookup for each page. This avoids O(n²)
 * work when enhancing many pages.
 */

import {
  filterToPath,
  SORT_OPTIONS,
  toSortedPath,
} from "#filters/filter-core.js";
import { mapFilter } from "#toolkit/fp/array.js";
import { mapEntries, omit, toObject } from "#toolkit/fp/object.js";

/** @typedef {import("#lib/types").FilterSet} FilterSet */
/** @typedef {import("#lib/types").FilterAttributeData} FilterAttributeData */
/** @typedef {import("#lib/types").FilterUIData} FilterUIData */

/**
 * Build a lookup table from valid filter paths.
 * Call once per category, then reuse for all pages in that category.
 *
 * @param {{ path: string }[]} validPages - Array of valid page objects with paths
 * @returns {Record<string, true>} Lookup table for O(1) path validation
 */
export const buildPathLookup = (validPages) =>
  toObject(validPages, (p) => [p.path, true]);

/**
 * Build filter description parts from filters using display lookup
 * Returns structured data for template rendering
 * { size: "compact", type: "pro" } => [{ key: "Size", value: "compact" }, ...]
 * @param {FilterSet} filters - Current filters
 * @param {Record<string, string>} displayLookup - Slug to display text lookup
 * @returns {{ key: string, value: string }[]} Filter description parts
 */
export const buildFilterDescription = (filters, displayLookup) =>
  mapEntries((key, value) => ({
    key: displayLookup[key],
    value: displayLookup[value],
  }))(filters);

/**
 * Build base page object from a filter combination
 * @param {Object} combo - { filters, path, count }
 * @param {Array} matchedItems - Items matching the filters
 * @param {Object} displayLookup - Display text lookup
 * @returns {Object} Base page properties
 */
export const buildFilterPageBase = (combo, matchedItems, displayLookup) => ({
  filters: combo.filters,
  path: combo.path,
  count: combo.count,
  items: matchedItems,
  filterDescription: buildFilterDescription(combo.filters, displayLookup),
});

/**
 * Build filter UI data using a pre-built path lookup.
 * Use this when processing multiple pages to avoid rebuilding the lookup each time.
 *
 * @param {FilterAttributeData} filterData - Filter attribute data
 * @param {FilterSet} currentFilters - Current active filters (use {} for no filters)
 * @param {Record<string, true>} pathLookup - Pre-built lookup from buildPathLookup
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @param {string} [currentSortKey="default"] - Current sort key
 * @param {number} [count=2] - Current item count (used to hide sort/filters when <= 1)
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
export const buildUIWithLookup = (
  filterData,
  currentFilters,
  pathLookup,
  baseUrl,
  currentSortKey = "default",
  count = 2,
) => {
  const filters = currentFilters;

  if (Object.keys(filterData.attributes).length === 0) {
    return { hasFilters: false };
  }

  const hasActiveFilters = Object.keys(filters).length > 0;

  const sortGroup =
    count > 1
      ? {
          name: "sort",
          label: "Sort",
          options: SORT_OPTIONS.map((sortOption) => {
            const isActive = currentSortKey === sortOption.key;
            const path = toSortedPath(filters, sortOption.key);
            return {
              value: sortOption.label,
              url: path
                ? `${baseUrl}/search/${path}/#content`
                : `${baseUrl}/#content`,
              active: isActive,
            };
          }),
        }
      : null;

  const activeFilters = mapEntries((key, value) => {
    const removePath = toSortedPath(omit([key])(filters), currentSortKey);
    return {
      key: filterData.displayLookup[key],
      value: filterData.displayLookup[value],
      removeUrl: removePath
        ? `${baseUrl}/search/${removePath}/#content`
        : `${baseUrl}/#content`,
    };
  })(filters);

  // Build filter groups with options
  const attributeGroups = mapFilter(([attrName, attrValues]) => {
    const options = mapFilter((value) => {
      const isActive = filters[attrName] === value;
      const newFilters = { ...filters, [attrName]: value };
      const basePath = filterToPath(newFilters);
      // Check if base path is valid (sort variants are always valid if base is)
      if (!isActive && !pathLookup[basePath]) return null;
      const pathWithSort = toSortedPath(newFilters, currentSortKey);
      return {
        value: filterData.displayLookup[value],
        url: `${baseUrl}/search/${pathWithSort}/#content`,
        active: isActive,
      };
    })(attrValues);

    // Hide groups with 0 or 1 option (no meaningful choice to make)
    if (options.length <= 1) return null;
    return {
      name: attrName,
      label: filterData.displayLookup[attrName],
      options,
    };
  })(Object.entries(filterData.attributes));

  // Sort group first (if present), then attribute groups
  const groups = sortGroup ? [sortGroup, ...attributeGroups] : attributeGroups;

  return {
    hasFilters: groups.length > 0 || hasActiveFilters,
    hasActiveFilters,
    activeFilters,
    clearAllUrl: `${baseUrl}/#content`,
    groups,
  };
};

/**
 * Build pre-computed filter UI data for templates.
 * Convenience wrapper that builds the path lookup internally.
 * For processing many pages, use buildPathLookup + buildUIWithLookup instead.
 *
 * @param {FilterAttributeData} filterData - Filter attribute data
 * @param {FilterSet} currentFilters - Current active filters (use {} for no filters)
 * @param {{ path: string }[]} validPages - Array of valid page paths
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @param {string} [currentSortKey="default"] - Current sort key
 * @param {number} [count=2] - Current item count (used to hide sort/filters when <= 1)
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
export const buildFilterUIData = (
  filterData,
  currentFilters,
  validPages,
  baseUrl,
  currentSortKey = "default",
  count = 2,
) =>
  buildUIWithLookup(
    filterData,
    currentFilters,
    buildPathLookup(validPages),
    baseUrl,
    currentSortKey,
    count,
  );

/**
 * Add filterUI to each page object with sort support.
 * Builds the path lookup once and reuses it for all pages (avoids O(n²) work).
 *
 * @param {Array} pages - Page objects to enhance
 * @param {Object} filterData - { attributes, displayLookup }
 * @param {string} baseUrl - Base URL for filter links
 * @param {{ path: string }[]} validBasePaths - Valid base paths (without sort) for validation
 * @returns {Array} New pages array with filterUI added
 */
export const enhanceWithFilterUI = (
  pages,
  filterData,
  baseUrl,
  validBasePaths,
) => {
  // Build lookup once, reuse for all pages
  const pathLookup = buildPathLookup(validBasePaths);

  return pages.map((page) => ({
    ...page,
    filterUI: buildUIWithLookup(
      filterData,
      page.filters,
      pathLookup,
      baseUrl,
      page.sortKey || "default",
      page.count,
    ),
  }));
};
