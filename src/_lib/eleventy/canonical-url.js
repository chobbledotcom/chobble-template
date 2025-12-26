import { canonicalUrl } from "#utils/canonical-url.js";

export function configureCanonicalUrl(eleventyConfig) {
  eleventyConfig.addFilter("canonicalUrl", function (pageUrl) {
    const siteUrl = this.ctx?.site?.url || "";
    return canonicalUrl(siteUrl, pageUrl);
  });
}
