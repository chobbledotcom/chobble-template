/**
 * Filter combination generation.
 *
 * Functions for generating all valid filter combinations and redirects:
 * - Pre-computing filter combinations with matching item counts
 * - Generating redirect rules for invalid filter paths
 */

import {
  buildItemLookup,
  countMatches,
  filterToPath,
  getAllFilterAttributes,
  normalizeAttrs,
} from "#filters/filter-core.js";
import { filterMap, flatMap, map, pipe } from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";

/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */
/** @typedef {import("#lib/types").FilterSet} FilterSet */
/** @typedef {import("#lib/types").FilterCombination} FilterCombination */

/**
 * Generate all filter combinations that have matching items.
 * Returns: [{ filters: { color: "red" }, path: "color/red", count: 5 }, ...]
 *
 * @param {EleventyCollectionItem[]} items - Items to generate combinations for
 * @returns {FilterCombination[]} All valid filter combinations
 */
export const generateFilterCombinations = memoize((items) => {
  const values = getAllFilterAttributes(items);
  const keys = Object.keys(values);

  if (keys.length === 0) return [];

  const lookup = buildItemLookup(items);

  // Recursive helper to build all valid filter combinations
  // Uses closure to avoid passing state object through recursion
  const buildCombosFrom = (currentFilters, startKeyIndex) =>
    keys.slice(startKeyIndex).flatMap((key, offset) =>
      values[key].flatMap((value) => {
        const filters = { ...currentFilters, [key]: value };
        const count = countMatches(
          lookup,
          normalizeAttrs(filters),
          items.length,
        );
        if (count === 0) return [];
        const combo = { filters, path: filterToPath(filters), count };
        return [combo, ...buildCombosFrom(filters, startKeyIndex + offset + 1)];
      }),
    );

  return buildCombosFrom({}, 0);
});

/**
 * Generate filter redirects for invalid filter paths.
 * Shared logic used by both global and category-scoped filters.
 * @param {EleventyCollectionItem[]} items - Items to generate redirects for
 * @param {string} searchUrl - Base search URL (e.g., "/products/search" or "/categories/widgets/search")
 * @returns {Array} Redirect objects { from, to }
 */
export const generateFilterRedirects = (items, searchUrl) => {
  const attrKeys = Object.keys(getAllFilterAttributes(items));
  if (attrKeys.length === 0) return [];

  const toRedirect = (basePath, key) => ({
    from: `${searchUrl}${basePath}/${key}/`,
    to: `${searchUrl}${basePath}/#content`,
  });

  const simpleRedirects = map((key) => toRedirect("", key))(attrKeys);

  const comboRedirects = pipe(
    flatMap((combo) =>
      filterMap(
        (key) => !combo.filters[key],
        (key) => toRedirect(`/${combo.path}`, key),
      )(attrKeys),
    ),
  )(generateFilterCombinations(items));

  return [...simpleRedirects, ...comboRedirects];
};
