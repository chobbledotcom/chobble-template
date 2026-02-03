// Determines which CSS/JS bundle to use based on layout and config

import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {Object} BodyClassesOptions
 * @property {string[]} [designSystemLayouts]
 * @property {boolean} [forceDesignSystem]
 * @property {boolean} [stickyMobileNav]
 * @property {boolean} [horizontalNav]
 * @property {boolean} [hasRightContent]
 * @property {boolean} [navigationIsClicky]
 */

/**
 * @typedef {Object} BodyClassesConfig
 * @property {string[]} designSystemLayouts
 * @property {boolean} forceDesignSystem
 * @property {boolean} stickyMobileNav
 * @property {boolean} horizontalNav
 * @property {boolean} hasRightContent
 * @property {boolean} navigationIsClicky
 */

const usesDesignSystem = (layout, designSystemLayouts) =>
  designSystemLayouts.includes(layout);

const getCssBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/css/design-system-bundle.css"
    : "/css/bundle.css";

const OPTIONS_KEYS = [
  "designSystemLayouts",
  "forceDesignSystem",
  "stickyMobileNav",
  "horizontalNav",
  "hasRightContent",
  "navigationIsClicky",
];

const SITE_CONFIG_KEYS = [
  "sticky_mobile_nav",
  "horizontal_nav",
  "design_system_layouts",
  "navigation_is_clicky",
];

const RIGHT_CONTENT_PATH = "src/snippets/right-content.md";

/**
 * Check if value is an options object (camelCase keys, from JS/tests).
 * @param {unknown} value
 * @returns {value is BodyClassesOptions}
 */
const isOptionsObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.keys(value).length === 0 ||
    Object.keys(value).some((k) => OPTIONS_KEYS.includes(k)));

/**
 * Check if value is a site config object (snake_case keys, from Liquid).
 * @param {unknown} value
 * @returns {boolean}
 */
const isSiteConfig = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).some((k) => SITE_CONFIG_KEYS.includes(k));

/**
 * Check whether the right-content snippet file exists.
 * @returns {boolean}
 */
const detectRightContent = () =>
  fs.existsSync(path.join(process.cwd(), RIGHT_CONTENT_PATH));

/**
 * Parse camelCase options object into normalized config.
 * @param {BodyClassesOptions} opts
 * @returns {BodyClassesConfig}
 */
const parseOptionsObject = ({
  designSystemLayouts = [],
  forceDesignSystem,
  stickyMobileNav,
  horizontalNav,
  hasRightContent,
  navigationIsClicky,
}) => ({
  designSystemLayouts,
  forceDesignSystem: Boolean(forceDesignSystem),
  stickyMobileNav: Boolean(stickyMobileNav),
  horizontalNav: horizontalNav !== false,
  hasRightContent: Boolean(hasRightContent),
  navigationIsClicky: Boolean(navigationIsClicky),
});

/**
 * Parse site config (snake_case) into normalized config.
 * hasRightContent is auto-detected from the filesystem.
 * design-system class is handled by the template, not by this function.
 * @param {Object} siteConfig
 * @returns {BodyClassesConfig}
 */
const parseSiteConfig = (siteConfig) => ({
  designSystemLayouts: [],
  forceDesignSystem: false,
  stickyMobileNav: Boolean(siteConfig.sticky_mobile_nav),
  horizontalNav: siteConfig.horizontal_nav !== false,
  hasRightContent: detectRightContent(),
  navigationIsClicky: Boolean(siteConfig.navigation_is_clicky),
});

/**
 * Parse positional arguments into normalized config.
 * @param {string[]} layouts
 * @param {boolean} forceDesignSystem
 * @param {boolean} stickyMobileNav
 * @param {boolean} horizontalNav
 * @param {boolean} hasRightContent
 * @returns {BodyClassesConfig}
 */
const parsePositionalArgs = (
  layouts = [],
  forceDesignSystem,
  stickyMobileNav,
  horizontalNav,
  hasRightContent,
) => ({
  designSystemLayouts: layouts,
  forceDesignSystem,
  stickyMobileNav,
  horizontalNav,
  hasRightContent,
  navigationIsClicky: false,
});

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
 * Build classes array from layout and config.
 * @param {string | null} layout
 * @param {BodyClassesConfig} config
 * @returns {(string | null)[]}
 */
const buildBodyClasses = (layout, config) => {
  const showDesignSystem =
    config.forceDesignSystem ||
    usesDesignSystem(layout, config.designSystemLayouts);

  return [
    layout ? layout.replace(".html", "") : null,
    showDesignSystem ? "design-system" : null,
    config.stickyMobileNav ? "sticky-mobile-nav" : null,
    config.horizontalNav ? "horizontal-nav" : "left-nav",
    config.hasRightContent ? "two-columns" : "one-column",
    config.navigationIsClicky ? "clicky-nav" : null,
  ];
};

/**
 * Generates body CSS classes based on layout and config.
 *
 * Supports three calling conventions:
 *
 * 1. Site config object (from Liquid templates):
 *    layout | getBodyClasses: config, extraClasses
 *    hasRightContent is auto-detected from the filesystem.
 *    design-system class is handled directly in the template.
 *
 * 2. Options object (for JS usage and testing):
 *    getBodyClasses(layout, { stickyMobileNav, horizontalNav, ... })
 *
 * 3. Positional arguments (legacy):
 *    layout | getBodyClasses: designSystemLayouts, forceDesignSystem, stickyMobileNav, horizontalNav, hasRightContent
 *
 * @param {string | null} layout
 * @param {Object | string[] | BodyClassesOptions} [configOrOpts]
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @param {*} [arg4]
 * @returns {string}
 */
const getBodyClasses = (
  layout,
  configOrOpts = [],
  arg2 = false,
  arg3 = false,
  arg4 = false,
) => {
  if (isSiteConfig(configOrOpts)) {
    const config = parseSiteConfig(configOrOpts);
    const extra = normalizeExtraClasses(arg2);
    return [
      ...buildBodyClasses(layout, config).filter(Boolean),
      ...extra.filter(Boolean),
    ].join(" ");
  }

  const config = isOptionsObject(configOrOpts)
    ? parseOptionsObject(configOrOpts)
    : parsePositionalArgs(
        configOrOpts,
        Boolean(arg2),
        Boolean(arg3),
        Boolean(arg4),
        false,
      );

  return buildBodyClasses(layout, config).filter(Boolean).join(" ");
};

export const configureStyleBundle = (eleventyConfig) => {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
};
