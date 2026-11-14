// Generates body CSS classes based on layout and config

import { registerFilters } from "#eleventy/register.js";
import { slugify } from "#utils/slug-utils.js";

/**
 * Generates body CSS classes based on layout and site config.
 *
 * Called from Liquid templates as:
 *   layout | getBodyClasses: config, extraClasses, featured, page.url
 *
 * design-system class is handled directly in the template.
 *
 * The page-path class is derived from pageUrl:
 * "/"                          -> "page--home"
 * "/about-us/"                 -> "page--about-us"
 * "/products/example-product/" -> "page--products--example-product"
 *
 * @param {string} layout
 * @param {{ sticky_mobile_nav?: boolean, horizontal_nav?: boolean }} siteConfig - The site config object (snake_case keys)
 * @param {string[]} [extraClasses] - Additional classes from theme body_classes
 * @param {boolean} [featured] - Whether the current page is featured
 * @param {string} [pageUrl] - The current page URL (page.url)
 * @returns {string}
 */
const getBodyClasses = (
  layout,
  siteConfig,
  extraClasses,
  featured,
  pageUrl,
) => {
  const pagePathClass =
    typeof pageUrl === "string"
      ? `page--${
          pageUrl
            .split("/")
            .filter(Boolean)
            .map((segment) => slugify(segment))
            .join("--") || "home"
        }`
      : null;
  const classes = [
    layout.replace(".html", ""),
    siteConfig.sticky_mobile_nav ? "sticky-mobile-nav" : null,
    siteConfig.horizontal_nav !== false ? "horizontal-nav" : "left-nav",
    featured ? "featured" : null,
    pagePathClass,
    ...(Array.isArray(extraClasses) ? extraClasses : []),
  ];

  return classes.filter(Boolean).join(" ");
};

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureStyleBundle = (eleventyConfig) => {
  registerFilters(eleventyConfig)({ getBodyClasses });
};
