// Determines which CSS/JS bundle to use based on layout and config

/**
 * Check if a layout should use the design system bundle
 * @param {string} layout - The layout name (e.g., "landing-page.html")
 * @param {string[]} designSystemLayouts - Array of layouts that use design system
 * @returns {boolean}
 */
export function usesDesignSystem(layout, designSystemLayouts) {
  if (!layout || !designSystemLayouts) return false;
  return designSystemLayouts.includes(layout);
}

/**
 * Get the CSS bundle path for a layout
 * @param {string} layout - The layout name
 * @param {string[]} designSystemLayouts - Array of layouts that use design system
 * @returns {string}
 */
export function getCssBundle(layout, designSystemLayouts) {
  return usesDesignSystem(layout, designSystemLayouts)
    ? "/css/landing-bundle.css"
    : "/css/bundle.css";
}

/**
 * Get the JS bundle path for a layout
 * @param {string} layout - The layout name
 * @param {string[]} designSystemLayouts - Array of layouts that use design system
 * @returns {string}
 */
export function getJsBundle(layout, designSystemLayouts) {
  return usesDesignSystem(layout, designSystemLayouts)
    ? "/assets/js/landing-bundle.js"
    : "/assets/js/bundle.js";
}

export function configureStyleBundle(eleventyConfig) {
  eleventyConfig.addFilter("usesDesignSystem", usesDesignSystem);
  eleventyConfig.addFilter("getCssBundle", getCssBundle);
  eleventyConfig.addFilter("getJsBundle", getJsBundle);
}
