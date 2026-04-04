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
 * Generates body CSS classes based on layout and site config.
 *
 * Called from Liquid templates as:
 *   layout | getBodyClasses: config, extraClasses, featured
 *
 * hasRightContent is auto-detected from the filesystem.
 * design-system class is handled directly in the template.
 *
 * @param {string} layout
 * @param {Object} siteConfig - The site config object (snake_case keys)
 * @param {string[]} [extraClasses] - Additional classes from theme body_classes
 * @param {boolean} [featured] - Whether the current page is featured
 * @returns {string}
 */
const getBodyClasses = (layout, siteConfig, extraClasses = [], featured) => {
  const classes = [
    layout.replace(".html", ""),
    siteConfig.sticky_mobile_nav ? "sticky-mobile-nav" : null,
    siteConfig.horizontal_nav !== false ? "horizontal-nav" : "left-nav",
    detectRightContent() ? "two-columns" : "one-column",
    featured ? "featured" : null,
    ...extraClasses,
  ];

  return classes.filter(Boolean).join(" ");
};

export const configureStyleBundle = (eleventyConfig) => {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
};
