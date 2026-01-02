/**
 * Area list formatting - filters and sorts location collections
 * for use with Liquid templates.
 *
 * Logic lives here; HTML markup lives in area-list.html template.
 */

/**
 * Check if a URL represents a top-level location.
 * Top-level locations have exactly 2 path segments.
 * e.g., "/locations/springfield/" -> ["locations", "springfield"]
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if top-level location
 */
const isTopLevelLocation = (url) => {
  if (!url) return false;
  const segments = url.split("/").filter((s) => s !== "");
  return segments.length === 2;
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
 * Prepare area list data for template rendering.
 * Filters, sorts, and adds separators so the template just loops and renders.
 *
 * @param {Array} locations - Array of location objects
 * @param {string} currentUrl - URL of the current page to exclude
 * @returns {Array} Array of {url, name, separator} ready for template
 */
const prepareAreaList = (locations, currentUrl) => {
  const filtered = filterTopLevelLocations(locations, currentUrl);
  const sorted = sortByNavigationKey(filtered);

  return sorted.map((loc, index) => {
    let separator = "";
    if (index < sorted.length - 1) {
      separator = index === sorted.length - 2 ? " and " : ", ";
    }
    return {
      url: loc.url || "",
      name: loc.data?.eleventyNavigation?.key || "",
      separator,
    };
  });
};

/**
 * Configure the Eleventy filters for area list.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
const configureAreaList = (eleventyConfig) => {
  eleventyConfig.addFilter("prepareAreaList", prepareAreaList);
};

export {
  isTopLevelLocation,
  sortByNavigationKey,
  filterTopLevelLocations,
  formatListWithAnd,
  prepareAreaList,
  configureAreaList,
};
