/**
 * Filter UI building utilities.
 *
 * Functions for building filter UI data structures for templates:
 * - Active filter pills with remove URLs
 * - Filter groups with options
 * - Filter descriptions for headings
 */

import { filterToPath } from "#filters/filter-core.js";
import { map, mapFilter } from "#toolkit/fp/array.js";
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
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
export const buildFilterUIData = (
  filterData,
  currentFilters,
  validPages,
  baseUrl,
) => {
  const allAttributes = filterData.attributes;
  const display = filterData.displayLookup;

  if (Object.keys(allAttributes).length === 0) {
    return { hasFilters: false };
  }

  // Use lookup object for O(1) path lookups instead of O(n) array includes
  const validPathLookup = toObject(validPages, (p) => [p.path, true]);
  const filters = currentFilters || {};
  const hasActiveFilters = Object.keys(filters).length > 0;

  // Build active filter pills with remove URLs
  const activeFilters = mapEntries((key, value) => {
    const removePath = filterToPath(omit([key])(filters));
    return {
      key: display[key],
      value: display[value],
      removeUrl: removePath
        ? `${baseUrl}/search/${removePath}/#content`
        : `${baseUrl}/#content`,
    };
  })(filters);

  // Build filter groups with options
  const groups = mapFilter(([attrName, attrValues]) => {
    const options = mapFilter((value) => {
      const isActive = filters[attrName] === value;
      const path = filterToPath({ ...filters, [attrName]: value });
      if (!isActive && !validPathLookup[path]) return null;
      return {
        value: display[value],
        url: `${baseUrl}/search/${path}/#content`,
        active: isActive,
      };
    })(attrValues);

    if (options.length === 0) return null;
    return { name: attrName, label: display[attrName], options };
  })(Object.entries(allAttributes));

  return {
    hasFilters: groups.length > 0,
    hasActiveFilters,
    activeFilters,
    clearAllUrl: `${baseUrl}/#content`,
    groups,
  };
};

/**
 * Add filterUI to each page object
 * @param {Array} pages - Page objects to enhance
 * @param {Object} filterData - { attributes, displayLookup }
 * @param {string} baseUrl - Base URL for filter links
 * @returns {Array} New pages array with filterUI added
 */
export const addFilterUI = (pages, filterData, baseUrl) =>
  map((page) => ({
    ...page,
    filterUI: buildFilterUIData(filterData, page.filters, pages, baseUrl),
  }))(pages);
