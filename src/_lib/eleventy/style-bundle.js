// Determines which CSS/JS bundle to use based on layout and config

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
const getBodyClasses = (
  layout,
  layoutsOrOpts = [],
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
    if (isOptionsObject(layoutsOrOpts)) {
      const opts = /** @type {Record<string, unknown>} */ (
        /** @type {unknown} */ (layoutsOrOpts)
      );
      return {
        designSystemLayouts:
          /** @type {string[]} */ (opts.designSystemLayouts) || [],
        forceDesignSystem: Boolean(opts.forceDesignSystem),
        stickyMobileNav: Boolean(opts.stickyMobileNav),
        horizontalNav: opts.horizontalNav !== false,
        hasRightContent: Boolean(opts.hasRightContent),
      };
    }
    return {
      designSystemLayouts: /** @type {string[]} */ (layoutsOrOpts) || [],
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
