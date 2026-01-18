/**
 * DOM transform for adding target="_blank" to external links.
 *
 * Finds all anchor elements with href starting with http:// or https://
 * and adds target="_blank" rel="noopener noreferrer" attributes.
 */

/**
 * Check if URL is external (http:// or https://)
 * @param {string} url
 * @returns {boolean}
 */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/**
 * Add target="_blank" and rel="noopener noreferrer" to external links
 * @param {*} document
 * @param {{ externalLinksTargetBlank?: boolean }} config
 */
const addExternalLinkAttrs = (document, config) => {
  if (!config?.externalLinksTargetBlank) return;

  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (href && isExternalUrl(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }
};

/**
 * Get external link attributes string for use in templates
 * @param {string} url
 * @param {boolean} targetBlank
 * @returns {string}
 */
const getExternalLinkAttrs = (url, targetBlank) =>
  targetBlank && typeof url === "string" && isExternalUrl(url)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";

export { addExternalLinkAttrs, getExternalLinkAttrs, isExternalUrl };
