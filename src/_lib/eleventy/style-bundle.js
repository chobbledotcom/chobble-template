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
  const optionKeys = [
    "designSystemLayouts",
    "forceDesignSystem",
    "stickyMobileNav",
    "horizontalNav",
    "hasRightContent",
  ];

  const isOptionsObject = (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.keys(value).length === 0 ||
      Object.keys(value).some((k) => optionKeys.includes(k)));

  const parseConfig = () => {
    if (isOptionsObject(designSystemLayoutsOrOptions)) {
      return {
        designSystemLayouts:
          designSystemLayoutsOrOptions.designSystemLayouts || [],
        forceDesignSystem:
          designSystemLayoutsOrOptions.forceDesignSystem || false,
        stickyMobileNav: designSystemLayoutsOrOptions.stickyMobileNav || false,
        horizontalNav: designSystemLayoutsOrOptions.horizontalNav !== false,
        hasRightContent: designSystemLayoutsOrOptions.hasRightContent || false,
      };
    }
    return {
      designSystemLayouts: designSystemLayoutsOrOptions || [],
      forceDesignSystem: forceDesignSystemArg,
      stickyMobileNav: stickyMobileNavArg,
      horizontalNav: horizontalNavArg,
      hasRightContent: hasRightContentArg,
    };
  };

  const config = parseConfig();

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
