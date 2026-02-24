/**
 * Filter combination generation.
 *
 * Pre-computes all valid filter combinations with matching item counts.
 */

import {
  buildItemLookup,
  countMatches,
  filterToPath,
  getAllFilterAttributes,
  normalize,
} from "#filters/filter-core.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";

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
export const generateFilterCombinations = memoizeByRef((items) => {
  const values = getAllFilterAttributes(items);
  const keys = Object.keys(values);

  if (keys.length === 0) return [];

  const lookup = buildItemLookup(items);

  // Pre-normalize every key and value once, so we don't repeat this work
  // for every combination explored. "pet-friendly" → "petfriendly" etc.
  const normalized = Object.fromEntries([
    ...keys.map((key) => [key, normalize(key)]),
    ...keys.flatMap((key) => values[key].map((v) => [v, normalize(v)])),
  ]);

  // Build all filter combinations that have at least one matching item.
  // Tries adding each remaining filter key+value to the current set,
  // checks if any items match, and recurses to try adding more.
  const buildCombosFrom = (currentFilters, normalizedFilters, startKeyIndex) =>
    keys.slice(startKeyIndex).flatMap((key, offset) =>
      values[key].flatMap((value) => {
        const filters = { ...currentFilters, [key]: value };
        const normFilters = {
          ...normalizedFilters,
          [normalized[key]]: normalized[value],
        };
        const count = countMatches(lookup, normFilters, items.length);
        if (count === 0) return [];
        const combo = { filters, path: filterToPath(filters), count };
        return [
          combo,
          ...buildCombosFrom(filters, normFilters, startKeyIndex + offset + 1),
        ];
      }),
    );

  return buildCombosFrom({}, {}, 0);
});
