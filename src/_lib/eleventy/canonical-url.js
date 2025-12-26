import site from "#data/site.json" with { type: "json" };
import { canonicalUrl } from "#utils/canonical-url.js";

export function configureCanonicalUrl(eleventyConfig) {
  eleventyConfig.addFilter("canonicalUrl", (pageUrl) =>
    canonicalUrl(site.url, pageUrl),
  );
}
