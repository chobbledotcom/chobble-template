/**
 * URL management helpers for client-side category filtering.
 *
 * Pure functions for converting between filter/sort state and URL paths.
 * Used by category-filter.js for history API integration.
 */

const SORT_KEYS = {
  "price-asc": true,
  "price-desc": true,
  "name-asc": true,
  "name-desc": true,
};

/**
 * Convert filter object to URL path segment.
 * Keys are sorted alphabetically for stable URLs.
 * { colour: "red", size: "large" } => "colour/red/size/large"
 *
 * @param {Record<string, string>} filters
 * @returns {string}
 */
const filterToPath = (filters) => {
  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return "";
  return keys
    .flatMap((key) => [
      encodeURIComponent(key),
      encodeURIComponent(filters[key]),
    ])
    .join("/");
};

/**
 * Build a full URL from the current pathname, filters, and sort key.
 *
 * @param {string} pathname - Current page pathname
 * @param {Record<string, string>} filters - Active filter key/value pairs
 * @param {string} sortKey - Current sort key ("default" means no sort suffix)
 * @returns {string} New URL path
 */
const buildFilterURL = (pathname, filters, sortKey) => {
  const basePath = pathname.split("/search/")[0].replace(/\/$/, "");
  const path = filterToPath(filters);
  const suffix = sortKey && sortKey !== "default" ? sortKey : "";
  const searchPart = [path, suffix].filter(Boolean).join("/");
  return searchPart ? `${basePath}/search/${searchPart}/` : `${basePath}/`;
};

/**
 * Parse filter state from a URL pathname.
 *
 * @param {string} pathname - URL pathname to parse
 * @returns {{ filters: Record<string, string>, sortKey: string }}
 */
const parseFiltersFromPath = (pathname) => {
  const match = pathname.match(/\/search\/(.+?)\/?$/);
  if (!match) return { filters: {}, sortKey: "default" };

  const parts = match[1].split("/").filter(Boolean);
  const hasSortSuffix = parts.length > 0 && SORT_KEYS[parts[parts.length - 1]];
  const sortKey = hasSortSuffix ? parts[parts.length - 1] : "default";
  const filterParts = hasSortSuffix ? parts.slice(0, -1) : parts;

  const filters = Object.fromEntries(
    Array.from({ length: Math.floor(filterParts.length / 2) }, (_, i) => [
      decodeURIComponent(filterParts[i * 2]),
      decodeURIComponent(filterParts[i * 2 + 1]),
    ]),
  );

  return { filters, sortKey };
};

export { buildFilterURL, parseFiltersFromPath };
