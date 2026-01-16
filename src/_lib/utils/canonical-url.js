import { siteUrl } from "#config/validated-config.js";

/**
 * Generates a canonical URL by joining the site URL with a page path.
 * Assumes site.url does not end with a slash (enforced by validated-config.js).
 *
 * @param {string} pageUrl - The page path (e.g., "/quote/" or "quote")
 * @returns {string} The canonical URL
 */
export function canonicalUrl(pageUrl) {
  if (!pageUrl || pageUrl === "/") return siteUrl;

  // Normalize page URL to start with a single slash
  const cleanPageUrl = `/${pageUrl.replace(/^\/+/, "")}`;

  return siteUrl + cleanPageUrl;
}
