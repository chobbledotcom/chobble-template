// Generates body CSS classes based on layout and config

import fs from "node:fs";
import path from "node:path";
import { registerFilters } from "#eleventy/register.js";
import { slugify } from "#utils/slug-utils.js";

const RIGHT_CONTENT_PATH = "src/snippets/right-content.md";

/**
 * Check whether the right-content snippet file exists.
 * @returns {boolean}
 */
const detectRightContent = () =>
  fs.existsSync(path.join(process.cwd(), RIGHT_CONTENT_PATH));

/**
 * Generates body CSS classes based on layout and site config.
 *
 * Called from Liquid templates as:
 *   layout | getBodyClasses: config, extraClasses, featured, page.url
 *
 * hasRightContent is auto-detected from the filesystem.
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
    detectRightContent() ? "two-columns" : "one-column",
    featured ? "featured" : null,
    pagePathClass,
    ...(Array.isArray(extraClasses) ? extraClasses : []),
  ];

  return classes.filter(Boolean).join(" ");
};

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureStyleBundle = (eleventyConfig) => {
  registerFilters(eleventyConfig)({ getBodyClasses });
  eleventyConfig.addGlobalData("has_right_content", detectRightContent);
};
