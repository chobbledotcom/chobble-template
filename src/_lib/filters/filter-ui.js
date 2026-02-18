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
 * Build base page object from a filter combination.
 * Note: Does not include items/indices - caller adds those with appropriate key.
 * @param {Object} combo - { filters, path, count }
 * @param {Object} displayLookup - Display text lookup
 * @returns {Object} Base page properties
 */
export const buildFilterPageBase = (combo, displayLookup) => ({
  filters: combo.filters,
  path: combo.path,
  count: combo.count,
  filterDescription: buildFilterDescription(combo.filters, displayLookup),
});

/** Build a search URL from base URL and path */
const searchUrl = (baseUrl, path, useHash) =>
  useHash
    ? path
      ? `${baseUrl}#${path}`
      : baseUrl
    : path
      ? `${baseUrl}/search/${path}/#content`
      : `${baseUrl}/#content`;

/** Build sort option entries for the sort group */
const buildSortGroup = (ctx, combo) => ({
  name: "sort",
  label: "Sort",
  options: SORT_OPTIONS.map((sortOption) => ({
    value: sortOption.label,
    url: searchUrl(
      ctx.baseUrl,
      toSortedPath(combo.filters, sortOption.key),
      ctx.useHashUrls,
    ),
    active: combo.sortKey === sortOption.key,
    sortKey: sortOption.key,
  })),
});

/** Build active filter pills with remove URLs */
const buildActiveFilters = (ctx, combo) =>
  mapEntries((key, value) => ({
    key: ctx.filterData.displayLookup[key],
    value: ctx.filterData.displayLookup[value],
    removeUrl: searchUrl(
      ctx.baseUrl,
      toSortedPath(omit([key])(combo.filters), combo.sortKey),
      ctx.useHashUrls,
    ),
    removeFilterKey: key,
  }))(combo.filters);

/** Build filter attribute groups with option links */
const buildAttributeGroups = (ctx, combo) =>
  mapFilter(([attrName, attrValues]) => {
    const options = mapFilter((value) => {
      const isActive = combo.filters[attrName] === value;
      const newFilters = { ...combo.filters, [attrName]: value };
      if (!isActive && !ctx.pathLookup[filterToPath(newFilters)]) return null;
      return {
        value: ctx.filterData.displayLookup[value],
        url: searchUrl(
          ctx.baseUrl,
          toSortedPath(newFilters, combo.sortKey),
          ctx.useHashUrls,
        ),
        active: isActive,
        filterKey: attrName,
        filterValue: value,
        filterKeyLabel: ctx.filterData.displayLookup[attrName],
        filterValueLabel: ctx.filterData.displayLookup[value],
      };
    })(attrValues);

    if (options.length <= 1) return null;
    return {
      name: attrName,
      label: ctx.filterData.displayLookup[attrName],
      options,
    };
  })(Object.entries(ctx.filterData.attributes));

/**
 * Build filter UI data using a pre-built path lookup.
 * Use this when processing multiple pages to avoid rebuilding the lookup each time.
 *
 * @param {Object} ctx - Context with filter infrastructure
 * @param {FilterAttributeData} ctx.filterData - Filter attribute data
 * @param {Record<string, true>} ctx.pathLookup - Pre-built lookup from buildPathLookup
 * @param {string} ctx.baseUrl - Base URL for the item type (e.g., "/products" or "/properties")
 * @param {Object} combo - Current filter/sort combination
 * @param {FilterSet} combo.filters - Current active filters (use {} for no filters)
 * @param {string} combo.sortKey - Current sort key (use "default" for default sort)
 * @param {number} combo.count - Current item count (used to hide sort/filters when <= 1)
 * @returns {FilterUIData} Complete UI data ready for simple template loops
 */
export const buildUIWithLookup = (ctx, combo) => {
  if (Object.keys(ctx.filterData.attributes).length === 0) {
    return { hasFilters: false };
  }

  const hasActiveFilters = Object.keys(combo.filters).length > 0;
  const attributeGroups = buildAttributeGroups(ctx, combo);
  const sortGroup = combo.count > 1 ? buildSortGroup(ctx, combo) : null;
  const groups = sortGroup ? [sortGroup, ...attributeGroups] : attributeGroups;

  return {
    hasFilters: groups.length > 0 || hasActiveFilters,
    hasActiveFilters,
    activeFilters: buildActiveFilters(ctx, combo),
    clearAllUrl: ctx.useHashUrls ? ctx.baseUrl : `${ctx.baseUrl}/#content`,
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
  useHashUrls = false,
) =>
  buildUIWithLookup(
    {
      filterData,
      pathLookup: buildPathLookup(validPages),
      baseUrl,
      useHashUrls,
    },
    { filters: currentFilters, sortKey: currentSortKey, count },
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
      { filterData, pathLookup, baseUrl },
      {
        filters: page.filters,
        sortKey: page.sortKey || "default",
        count: page.count,
      },
    ),
  }));
};
