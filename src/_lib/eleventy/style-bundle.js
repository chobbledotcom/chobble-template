// Determines which CSS/JS bundle to use based on layout and config

export const usesDesignSystem = (layout, designSystemLayouts) =>
  designSystemLayouts.includes(layout);

export const getCssBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/css/landing-bundle.css"
    : "/css/bundle.css";

export const getJsBundle = (layout, designSystemLayouts) =>
  usesDesignSystem(layout, designSystemLayouts)
    ? "/assets/js/landing-bundle.js"
    : "/assets/js/bundle.js";

// Option keys for detecting options object vs positional arguments
const BODY_CLASS_OPTION_KEYS = [
  "designSystemLayouts",
  "forceDesignSystem",
  "stickyMobileNav",
  "horizontalNav",
  "hasRightContent",
];

/**
 * Detects if the value is an options object rather than a positional array.
 */
const isOptionsObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.keys(value).length === 0 ||
    Object.keys(value).some((k) => BODY_CLASS_OPTION_KEYS.includes(k)));

/**
 * Parse options from an options object.
 */
const parseOptionsObject = (opts) => ({
  designSystemLayouts: opts.designSystemLayouts || [],
  forceDesignSystem: opts.forceDesignSystem || false,
  stickyMobileNav: opts.stickyMobileNav || false,
  horizontalNav: opts.horizontalNav !== false,
  hasRightContent: opts.hasRightContent || false,
});

/**
 * Parse options from positional arguments.
 */
const parsePositionalArgs = (
  designSystemLayoutsArg,
  forceDesignSystemArg,
  stickyMobileNavArg,
  horizontalNavArg,
  hasRightContentArg,
) => ({
  designSystemLayouts: designSystemLayoutsArg || [],
  forceDesignSystem: forceDesignSystemArg,
  stickyMobileNav: stickyMobileNavArg,
  horizontalNav: horizontalNavArg,
  hasRightContent: hasRightContentArg,
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
 */
export const getBodyClasses = (
  layout,
  designSystemLayoutsOrOptions = [],
  forceDesignSystemArg = false,
  stickyMobileNavArg = false,
  horizontalNavArg = true,
  hasRightContentArg = false,
) => {
  const config = isOptionsObject(designSystemLayoutsOrOptions)
    ? parseOptionsObject(designSystemLayoutsOrOptions)
    : parsePositionalArgs(
        designSystemLayoutsOrOptions,
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

export function configureStyleBundle(eleventyConfig) {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getJsBundle", getJsBundle);
  eleventyConfig.addFilter("getBodyClasses", getBodyClasses);
}
