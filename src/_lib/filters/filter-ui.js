/**
 * Filter UI building utilities.
 *
 * Functions for building filter UI data structures for templates:
 * - Active filter pills with remove URLs
 * - Filter groups with options
 * - Sort group with options
 * - Filter descriptions for headings
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
 * Build pre-computed filter UI data for templates
 * @param {FilterAttributeData} filterData - Filter attribute data
 * @param {FilterSet | null | undefined} currentFilters - Current active filters
 * @param {{ path: string }[]} validPages - Array of valid page paths
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @param {string} [currentSortKey="default"] - Current sort key
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
export const buildFilterUIData = (
  filterData,
  currentFilters,
  validPages,
  baseUrl,
  currentSortKey = "default",
) => {
  if (Object.keys(filterData.attributes).length === 0) {
    return { hasFilters: false };
  }

  const filters = currentFilters || {};
  const hasActiveFilters = Object.keys(filters).length > 0;

  // Use lookup object for O(1) path lookups instead of O(n) array includes
  const validPathLookup = toObject(validPages, (p) => [p.path, true]);

  const sortOptions = SORT_OPTIONS.map((sortOption) => {
    const isActive = currentSortKey === sortOption.key;
    const path = toSortedPath(filters, sortOption.key);
    return {
      value: sortOption.label,
      url: path ? `${baseUrl}/search/${path}/#content` : `${baseUrl}/#content`,
      active: isActive,
    };
  });
  const sortGroup = { name: "sort", label: "Sort", options: sortOptions };

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
      if (!isActive && !validPathLookup[basePath]) return null;
      const pathWithSort = toSortedPath(newFilters, currentSortKey);
      return {
        value: filterData.displayLookup[value],
        url: `${baseUrl}/search/${pathWithSort}/#content`,
        active: isActive,
      };
    })(attrValues);

    if (options.length === 0) return null;
    return {
      name: attrName,
      label: filterData.displayLookup[attrName],
      options,
    };
  })(Object.entries(filterData.attributes));

  // Sort group first, then attribute groups
  const groups = [sortGroup, ...attributeGroups];

  return {
    hasFilters: groups.length > 0,
    hasActiveFilters,
    activeFilters,
    clearAllUrl: `${baseUrl}/#content`,
    groups,
  };
};

/**
 * Add filterUI to each page object with sort support
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
) =>
  pages.map((page) => ({
    ...page,
    filterUI: buildFilterUIData(
      filterData,
      page.filters,
      validBasePaths,
      baseUrl,
      page.sortKey || "default",
    ),
  }));
