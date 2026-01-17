/**
 * Utility types
 *
 * Types for utility functions like memoization.
 */

/**
 * Options for the memoize function
 */
export type MemoizeOptions<Args extends unknown[], _R> = {
  cacheKey?: (args: Args) => string | number;
};
