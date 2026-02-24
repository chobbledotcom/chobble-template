import { flatMap, join, pipe } from "#toolkit/fp/array.js";

/**
 * Convert filter object to a URL path segment.
 * Keys are sorted alphabetically for stable URLs.
 * @param {Record<string, string> | null | undefined} filters
 * @returns {string}
 */
const filterToPath = (filters) => {
  if (!filters) return "";
  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return "";
  return pipe(
    flatMap((key) => [
      encodeURIComponent(key),
      encodeURIComponent(filters[key]),
    ]),
    join("/"),
  )(keys);
};

export { filterToPath };
