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

/**
 * One language a site publishes, as declared in `_data/languages.json`.
 * Exactly one entry has `is_default`, which is the base language: the one
 * every URL outside another language's prefix is written in, and the one
 * `hreflang="x-default"` points at.
 */
export type Language = {
  code: string;
  hreflang: string;
  og_locale: string;
  label: string;
  home_url: string;
  home_label: string;
  breadcrumb_label: string;
  is_default?: boolean;
};
