import site from "#data/site.json" with { type: "json" };
import { canonicalUrl } from "#utils/canonical-url.js";

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

export function configureCanonicalUrl(eleventyConfig) {
  validateSiteUrl(site.url);

  eleventyConfig.addFilter("canonicalUrl", (pageUrl) =>
    canonicalUrl(site.url, pageUrl),
  );
}
