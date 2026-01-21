/**
 * Eleventy wrapper for canonical URL utility.
 * Wraps #utils/canonical-url.js as an Eleventy filter.
 */
import { canonicalUrl } from "#utils/canonical-url.js";

export const configureCanonicalUrl = (eleventyConfig) => {
  eleventyConfig.addFilter("canonicalUrl", canonicalUrl);
};
