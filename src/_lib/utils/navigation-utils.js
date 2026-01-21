/**
 * Navigation utilities for eleventyNavigation processing.
 *
 * Adds #content anchor to eleventyNavigation URLs when the
 * config.navigation_content_anchor flag is enabled, allowing users
 * to skip header navigation and jump directly to main content.
 */

/**
 * @param {Object} data - Page data containing eleventyNavigation and config
 * @param {Object|boolean|undefined} nav - The eleventyNavigation object to process
 * @returns {Object|boolean|undefined} The navigation object, potentially with url added
 */
export const withNavigationAnchor = (data, nav) => {
  const skipAnchor =
    !nav || nav === false || !data.config?.navigation_content_anchor || nav.url;
  if (skipAnchor) return nav;

  return {
    ...nav,
    url: `${data.page.url}#content`,
  };
};

/**
 * Builds eleventyNavigation, respecting existing nav config if present.
 * If data.eleventyNavigation exists, uses it (with anchor). Otherwise calls buildNav.
 * @param {Object} data - Page data
 * @param {function} buildNav - Function that takes data and returns navigation config
 * @returns {Object|boolean|undefined} The navigation object
 */
export const buildNavigation = (data, buildNav) => {
  if (data.eleventyNavigation) {
    return withNavigationAnchor(data, data.eleventyNavigation);
  }
  return buildNav(data);
};
