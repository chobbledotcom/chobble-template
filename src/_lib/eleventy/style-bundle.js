// Determines which CSS/JS bundle to use based on layout and config

import fs from "node:fs";
import path from "node:path";
import { slugify } from "#utils/slug-utils.js";

const usesDesignSystem = (layout, designSystemLayouts) =>
  designSystemLayouts.includes(layout);

const getCssBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/css/design-system-bundle.css"
    : "/css/bundle.css";

const RIGHT_CONTENT_PATH = "src/snippets/right-content.md";

/**
 * Check whether the right-content snippet file exists.
 * @returns {boolean}
 */
const detectRightContent = () =>
  fs.existsSync(path.join(process.cwd(), RIGHT_CONTENT_PATH));

/**
 * Build a page-path CSS class from a URL.
 *
 * "/"                          -> "page--home"
 * "/about-us/"                 -> "page--about-us"
 * "/products/example-product/" -> "page--products--example-product"
 *
 * @param {string} pageUrl
 * @returns {string|null}
 */
const getPagePathClass = (pageUrl) => {
  if (typeof pageUrl !== "string") return null;
  const segments = pageUrl
    .split("/")
    .filter(Boolean)
    .map((segment) => slugify(segment));
  const suffix = segments.length === 0 ? "home" : segments.join("--");
  return `page--${suffix}`;
};

/**
 * Generates body CSS classes based on layout and site config.
 *
 * Called from Liquid templates as:
 *   layout | getBodyClasses: config, extraClasses, featured, page.url
 *
 * hasRightContent is auto-detected from the filesystem.
 * design-system class is handled directly in the template.
 *
 * @param {string} layout
 * @param {Object} siteConfig - The site config object (snake_case keys)
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
  const classes = [
    layout.replace(".html", ""),
    siteConfig.sticky_mobile_nav ? "sticky-mobile-nav" : null,
    siteConfig.horizontal_nav !== false ? "horizontal-nav" : "left-nav",
    detectRightContent() ? "two-columns" : "one-column",
    featured ? "featured" : null,
    getPagePathClass(pageUrl),
    ...(Array.isArray(extraClasses) ? extraClasses : []),
  ];

  return classes.filter(Boolean).join(" ");
};

export const configureStyleBundle = (eleventyConfig) => {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
};
