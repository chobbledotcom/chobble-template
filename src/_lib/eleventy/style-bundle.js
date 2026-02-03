// Determines which CSS/JS bundle to use based on layout and config

import fs from "node:fs";
import path from "node:path";

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
 * Normalize extra classes from string, array, or falsy into an array.
 * @param {string | string[] | undefined | false} extraClasses
 * @returns {string[]}
 */
const normalizeExtraClasses = (extraClasses) => {
  if (!extraClasses) return [];
  if (typeof extraClasses === "string") return [extraClasses];
  if (Array.isArray(extraClasses)) return extraClasses;
  return [];
};

/**
 * Generates body CSS classes based on layout and site config.
 *
 * Called from Liquid templates as:
 *   layout | getBodyClasses: config, extraClasses
 *
 * hasRightContent is auto-detected from the filesystem.
 * design-system class is handled directly in the template.
 *
 * @param {string | null} layout
 * @param {Object} siteConfig - The site config object (snake_case keys)
 * @param {string | string[]} [extraClasses] - Additional classes to append
 * @returns {string}
 */
const getBodyClasses = (layout, siteConfig = {}, extraClasses) => {
  const classes = [
    layout ? layout.replace(".html", "") : null,
    siteConfig.sticky_mobile_nav ? "sticky-mobile-nav" : null,
    siteConfig.horizontal_nav !== false ? "horizontal-nav" : "left-nav",
    detectRightContent() ? "two-columns" : "one-column",
    siteConfig.navigation_is_clicky ? "clicky-nav" : null,
    ...normalizeExtraClasses(extraClasses),
  ];

  return classes.filter(Boolean).join(" ");
};

export const configureStyleBundle = (eleventyConfig) => {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
};
