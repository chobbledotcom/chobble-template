import { canonicalUrl } from "#utils/canonical-url.js";

export function configureCanonicalUrl(eleventyConfig) {
  eleventyConfig.addFilter("canonicalUrl", canonicalUrl);
}
