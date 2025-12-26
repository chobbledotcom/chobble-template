import site from "#data/site.json" with { type: "json" };

/**
 * Validates that site.url is a proper HTTP/HTTPS URL.
 * @param {string} url - The URL to validate
 * @throws {Error} If URL is missing or invalid
 */
function validateSiteUrl(url) {
  if (!url) {
    throw new Error("site.json is missing the 'url' field");
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(
        `site.json 'url' must use http or https protocol, got: ${url}`,
      );
    }
  } catch (e) {
    if (e.code === "ERR_INVALID_URL") {
      throw new Error(`site.json 'url' is not a valid URL: ${url}`);
    }
    throw e;
  }
}

// Validate on module load
validateSiteUrl(site.url);

/**
 * Generates a canonical URL by properly joining the site URL with a page path.
 * Prevents double slashes that occur when site.url ends with "/" and
 * page.url starts with "/".
 *
 * Root page "/" returns site URL without trailing slash.
 * All other pages preserve their trailing slashes.
 *
 * @param {string} pageUrl - The page path (e.g., "/quote/" or "quote")
 * @returns {string} The properly joined canonical URL
 */
export function canonicalUrl(pageUrl) {
  if (!pageUrl) return site.url.replace(/\/+$/, "");

  // Remove trailing slashes from site URL
  const cleanSiteUrl = site.url.replace(/\/+$/, "");

  // Normalize page URL to start with a single slash
  const cleanPageUrl = "/" + pageUrl.replace(/^\/+/, "");

  // Root page: return site URL without trailing slash
  if (cleanPageUrl === "/") {
    return cleanSiteUrl;
  }

  return cleanSiteUrl + cleanPageUrl;
}
