/**
 * URL management helpers for client-side category filtering.
 *
 * Uses hash fragments for filter state, e.g.:
 *   /categories/widgets/#colour/red/size/large/price-asc
 *
 * This works on static sites without server-side routing - the browser
 * always requests the base page, and JS reads the hash on load.
 */

import { filterToPath } from "#utils/filter-path.js";

const SORT_KEYS = {
  "price-asc": true,
  "price-desc": true,
  "name-asc": true,
  "name-desc": true,
};

/**
 * Build a hash fragment from filters and sort key.
 *
 * @param {Record<string, string>} filters - Active filter key/value pairs
 * @param {string} sortKey - Current sort key ("default" means no sort suffix)
 * @returns {string} Hash string including "#", or "" if no state
 */
const buildFilterHash = (filters, sortKey) => {
  const path = filterToPath(filters);
  const suffix = sortKey && sortKey !== "default" ? sortKey : "";
  const fragment = [path, suffix].filter(Boolean).join("/");
  return fragment ? `#${fragment}` : "";
};

/**
 * Parse filter state from a hash fragment.
 *
 * @param {string} hash - Hash string (e.g. "#colour/red/price-asc" or "")
 * @returns {{ filters: Record<string, string>, sortKey: string }}
 */
const parseFiltersFromHash = (hash) => {
  const raw = hash.replace(/^#/, "");
  if (!raw) return { filters: {}, sortKey: "default" };

  const parts = raw.split("/").filter(Boolean);
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

export { buildFilterHash, parseFiltersFromHash };
