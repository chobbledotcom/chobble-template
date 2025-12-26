/**
 * Generates a canonical URL by properly joining a site URL and page path.
 * Prevents double slashes that occur when site.url ends with "/" and
 * page.url starts with "/".
 *
 * Root page "/" returns site URL without trailing slash.
 * All other pages preserve their trailing slashes.
 *
 * @param {string} siteUrl - The base site URL (e.g., "https://example.com" or "https://example.com/")
 * @param {string} pageUrl - The page path (e.g., "/quote/" or "quote")
 * @returns {string} The properly joined canonical URL
 */
export function canonicalUrl(siteUrl, pageUrl) {
  if (!siteUrl) return pageUrl || "/";
  if (!pageUrl) return siteUrl.replace(/\/+$/, "");

  // Remove trailing slashes from site URL
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");

  // Normalize page URL to start with a single slash
  const cleanPageUrl = "/" + pageUrl.replace(/^\/+/, "");

  // Root page: return site URL without trailing slash
  if (cleanPageUrl === "/") {
    return cleanSiteUrl;
  }

  return cleanSiteUrl + cleanPageUrl;
}
