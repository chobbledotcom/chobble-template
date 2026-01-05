import site from "#data/site.json" with { type: "json" };

// Validate on module load
if (!site.url) {
  throw new Error("site.json is missing the 'url' field");
}

if (site.url.endsWith("/")) {
  throw new Error(`site.json 'url' must not end with a slash: ${site.url}`);
}

const parsed = new URL(site.url);
if (!["http:", "https:"].includes(parsed.protocol)) {
  throw new Error(
    `site.json 'url' must use http or https protocol, got: ${site.url}`,
  );
}

/**
 * Generates a canonical URL by joining the site URL with a page path.
 * Assumes site.url does not end with a slash (enforced by validation).
 *
 * @param {string} pageUrl - The page path (e.g., "/quote/" or "quote")
 * @returns {string} The canonical URL
 */
export function canonicalUrl(pageUrl) {
  if (!pageUrl || pageUrl === "/") return site.url;

  // Normalize page URL to start with a single slash
  const cleanPageUrl = `/${pageUrl.replace(/^\/+/, "")}`;

  return site.url + cleanPageUrl;
}
