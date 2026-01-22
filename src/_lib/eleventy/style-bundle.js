// Determines which CSS/JS bundle to use based on layout and config

/**
 * @typedef {Object} BodyClassesOptions
 * @property {string[]} [designSystemLayouts]
 * @property {boolean} [forceDesignSystem]
 * @property {boolean} [stickyMobileNav]
 * @property {boolean} [horizontalNav]
 * @property {boolean} [hasRightContent]
 */

/**
 * @typedef {Object} BodyClassesConfig
 * @property {string[]} designSystemLayouts
 * @property {boolean} forceDesignSystem
 * @property {boolean} stickyMobileNav
 * @property {boolean} horizontalNav
 * @property {boolean} hasRightContent
 */

const usesDesignSystem = (layout, designSystemLayouts) =>
  designSystemLayouts.includes(layout);

const getCssBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/css/design-system-bundle.css"
    : "/css/bundle.css";

const getJsBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/assets/js/design-system.js"
    : "/assets/js/bundle.js";

const OPTION_KEYS = [
  "designSystemLayouts",
  "forceDesignSystem",
  "stickyMobileNav",
  "horizontalNav",
  "hasRightContent",
];

/**
 * Check if value is an options object (vs positional array).
 * @param {unknown} value
 * @returns {value is BodyClassesOptions}
 */
const isOptionsObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.keys(value).length === 0 ||
    Object.keys(value).some((k) => OPTION_KEYS.includes(k)));

/**
 * Parse options object into normalized config.
 * @param {BodyClassesOptions} opts
 * @returns {BodyClassesConfig}
 */
const parseOptionsObject = ({
  designSystemLayouts = [],
  forceDesignSystem,
  stickyMobileNav,
  horizontalNav,
  hasRightContent,
}) => ({
  designSystemLayouts,
  forceDesignSystem: Boolean(forceDesignSystem),
  stickyMobileNav: Boolean(stickyMobileNav),
  horizontalNav: horizontalNav !== false,
  hasRightContent: Boolean(hasRightContent),
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
});

/**
 * Generates body CSS classes based on layout and config.
 * This function unifies body class generation for all layouts.
 *
 * Supports two calling conventions:
 *
 * 1. Options object (for JS usage and testing):
 *    getBodyClasses(layout, { designSystemLayouts, stickyMobileNav, ... })
 *
 * 2. Positional arguments (for Liquid filter):
 *    layout | getBodyClasses: designSystemLayouts, forceDesignSystem, stickyMobileNav, horizontalNav, hasRightContent
 *
 * @param {string | null} layout
 * @param {string[] | BodyClassesOptions} [layoutsOrOpts]
 * @param {boolean} [forceDesignSystemArg]
 * @param {boolean} [stickyMobileNavArg]
 * @param {boolean} [horizontalNavArg]
 * @param {boolean} [hasRightContentArg]
 * @returns {string}
 */
const getBodyClasses = (
  layout,
  layoutsOrOpts = [],
  forceDesignSystemArg = false,
  stickyMobileNavArg = false,
  horizontalNavArg = true,
  hasRightContentArg = false,
) => {
  const config = isOptionsObject(layoutsOrOpts)
    ? parseOptionsObject(layoutsOrOpts)
    : parsePositionalArgs(
        layoutsOrOpts,
        forceDesignSystemArg,
        stickyMobileNavArg,
        horizontalNavArg,
        hasRightContentArg,
      );

  const showDesignSystem =
    config.forceDesignSystem ||
    usesDesignSystem(layout, config.designSystemLayouts);

  const classes = [
    layout ? layout.replace(".html", "") : null,
    showDesignSystem ? "design-system" : null,
    config.stickyMobileNav ? "sticky-mobile-nav" : null,
    config.horizontalNav ? "horizontal-nav" : "left-nav",
    config.hasRightContent ? "two-columns" : "one-column",
  ];

  return classes.filter(Boolean).join(" ");
};

export const configureStyleBundle = (eleventyConfig) => {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getJsBundle", getJsBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
};
