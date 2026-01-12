/**
 * Adds #content anchor to eleventyNavigation URLs when config flag is enabled
 * @param {Object} data - Page data containing eleventyNavigation and config
 * @param {Object|boolean|undefined} nav - The eleventyNavigation object to process
 * @returns {Object|boolean|undefined} The navigation object, potentially with url added
 */
export const withNavigationAnchor = (data, nav) => {
  // Return as-is if:
  // - No eleventyNavigation
  // - eleventyNavigation is explicitly false
  // - Config flag is not set
  // - Already has a url
  if (!nav || nav === false || !data.config?.navigation_content_anchor) {
    return nav;
  }

  if (nav.url) {
    return nav;
  }

  // Add #content anchor to the page URL
  return {
    ...nav,
    url: `${data.page.url}#content`,
  };
};
