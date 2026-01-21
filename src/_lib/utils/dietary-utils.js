import { filter, pipe, uniqueBy } from "#toolkit/fp/array.js";

/**
 * Filters and deduplicates dietary keys, keeping only those with both symbol and label.
 * Returns unique keys based on symbol.
 * @param {Array<{symbol?: string, label?: string}>} keys
 * @returns {Array<{symbol: string, label: string}>}
 */
export const uniqueDietaryKeys = pipe(
  filter((key) => key.symbol && key.label),
  uniqueBy((key) => key.symbol),
);
