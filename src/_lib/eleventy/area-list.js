/**
 * Area list formatting - converts location collections into
 * formatted HTML lists with proper comma/and separation.
 *
 * Replaces complex Liquid template logic with testable JavaScript.
 */

/**
 * Check if a URL represents a top-level location.
 * Top-level locations have exactly 3 segments when split by "/".
 * e.g., "/locations/springfield/" splits to ["", "locations", "springfield", ""]
 * which has size 4, but we check for 3 non-empty segments.
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if top-level location
 */
const isTopLevelLocation = (url) => {
  if (!url) return false;
  const segments = url.split("/").filter((s) => s !== "");
  return segments.length === 2; // e.g., ["locations", "springfield"]
};

/**
 * Sort locations by their navigation key.
 *
 * @param {Array} locations - Array of location objects
 * @returns {Array} Sorted array
 */
const sortByNavigationKey = (locations) => {
  if (!locations || !Array.isArray(locations)) return [];
  return [...locations].sort((a, b) => {
    const keyA = a.data?.eleventyNavigation?.key || "";
    const keyB = b.data?.eleventyNavigation?.key || "";
    return keyA.localeCompare(keyB);
  });
};

/**
 * Filter locations to only include top-level ones, excluding the current page.
 *
 * @param {Array} locations - Array of location objects
 * @param {string} currentUrl - URL of the current page to exclude
 * @returns {Array} Filtered array
 */
const filterTopLevelLocations = (locations, currentUrl) => {
  if (!locations || !Array.isArray(locations)) return [];
  return locations.filter(
    (loc) => isTopLevelLocation(loc.url) && loc.url !== currentUrl,
  );
};

/**
 * Format a list of items with commas and "and" before the last item.
 * e.g., ["a", "b", "c"] => "a, b and c"
 *
 * @param {Array<string>} items - Array of strings to join
 * @returns {string} Formatted string
 */
const formatListWithAnd = (items) => {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return `${allButLast.join(", ")} and ${last}`;
};

/**
 * Generate HTML link for a location.
 *
 * @param {Object} location - Location object with url and data.eleventyNavigation.key
 * @returns {string} HTML anchor tag
 */
const locationToLink = (location) => {
  const url = location.url || "";
  const name = location.data?.eleventyNavigation?.key || "";
  return `<a href="${url}#content">${name}</a>`;
};

/**
 * Generate formatted area list HTML.
 *
 * @param {Array} locations - Array of location objects from collections.location
 * @param {string} currentUrl - URL of the current page (to exclude from list)
 * @param {string} prefix - Text to prepend (e.g., "We also serve ")
 * @param {string} suffix - Text to append (e.g., ".")
 * @returns {string} Complete HTML string
 */
const formatAreaList = (locations, currentUrl, prefix = "", suffix = "") => {
  const sorted = sortByNavigationKey(locations);
  const filtered = filterTopLevelLocations(sorted, currentUrl);

  if (filtered.length === 0) return "";

  const links = filtered.map(locationToLink);
  const formattedList = formatListWithAnd(links);

  return `${prefix}${formattedList}${suffix}`;
};

/**
 * Configure the Eleventy shortcode for area list.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
const configureAreaList = (eleventyConfig) => {
  eleventyConfig.addShortcode(
    "areaList",
    function (locations, prefix = "", suffix = "") {
      // `this.page.url` gives us the current page URL in Eleventy shortcodes
      const currentUrl = this.page?.url || "";
      return formatAreaList(locations, currentUrl, prefix, suffix);
    },
  );
};

export {
  isTopLevelLocation,
  sortByNavigationKey,
  filterTopLevelLocations,
  formatListWithAnd,
  locationToLink,
  formatAreaList,
  configureAreaList,
};
