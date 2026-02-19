/**
 * Navigation utilities for eleventyNavigation processing.
 *
 * Adds #content anchor to eleventyNavigation URLs when the
 * config.navigation_content_anchor flag is enabled, allowing users
 * to skip header navigation and jump directly to main content.
 */

/**
 * @param {*} data - Page data containing eleventyNavigation and config
 * @param {import("#lib/types").EleventyNav | false} [nav] - The eleventyNavigation object, false to suppress, or undefined if not set
 * @returns {import("#lib/types").EleventyNav | false | undefined} The navigation object, potentially with url added
 */
export const withNavigationAnchor = (data, nav) => {
  const skipAnchor = !nav || !data.config?.navigation_content_anchor || nav.url;
  if (skipAnchor) return nav;

  return {
    ...nav,
    url: `${data.page.url}#content`,
  };
};

/**
 * Builds eleventyNavigation, respecting existing nav config if present.
 * If data.eleventyNavigation exists, uses it (with anchor). Otherwise calls buildNav.
 * @param {*} data - Page data
 * @param {(data: *) => import("#lib/types").EleventyNav | false | undefined} buildNav - Function that takes data and returns navigation config
 * @returns {import("#lib/types").EleventyNav | false | undefined} The navigation object
 */
export const buildNavigation = (data, buildNav) => {
  if (data.eleventyNavigation) {
    return withNavigationAnchor(data, data.eleventyNavigation);
  }
  return buildNav(data);
};
