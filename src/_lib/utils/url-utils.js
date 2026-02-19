/**
 * URL helper utilities shared across build and client code.
 */

/**
 * Check if URL is external (http:// or https://).
 * @param {string} url
 * @returns {boolean}
 */
export const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");
