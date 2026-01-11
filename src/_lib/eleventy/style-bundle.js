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

export function configureStyleBundle(eleventyConfig) {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getJsBundle", getJsBundle);
}
