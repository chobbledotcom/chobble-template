import specsIcons from "#data/specs-icons.json" with { type: "json" };
import { inlineAsset } from "#media/inline-asset.js";

/**
 * Get the spec icon config for a spec name
 * Normalizes the spec name (lowercase, trimmed) before lookup
 * @param {string} specName - The spec name to look up
 * @returns {{ icon: string, highlight: boolean }|null} - The spec config or null if not found
 */
const getSpecConfig = (specName) => {
  if (!specName) return null;
  const normalized = specName.toLowerCase().trim();
  return specsIcons[normalized] ?? null;
};

/**
 * Get the icon SVG content for a spec name
 * Normalizes the spec name (lowercase, trimmed) before lookup
 * @param {string} specName - The spec name to look up
 * @returns {string} - The icon SVG content or empty string if not found
 */
const getSpecIcon = (specName) => {
  const config = getSpecConfig(specName);
  if (!config?.icon) return "";
  return inlineAsset(`icons/${config.icon}`);
};

/**
 * Transform specs array to include icon and highlight properties
 * @param {Object} data - Eleventy data object
 * @returns {Array|undefined} - Specs array with icon and highlight properties added
 */
const computeSpecs = (data) => {
  if (!data.specs) return undefined;
  return data.specs.map((spec) => {
    const config = getSpecConfig(spec.name);
    return {
      ...spec,
      icon: config?.icon ? inlineAsset(`icons/${config.icon}`) : "",
      highlight: config?.highlight ?? false,
    };
  });
};

/**
 * Filter specs to only show highlighted ones if any spec has highlight set
 * If no specs have highlight: true, returns all specs
 * @param {Array} specs - Array of spec objects with highlight property
 * @returns {Array} - Filtered specs array
 */
const getHighlightedSpecs = (specs) => {
  if (!specs || specs.length === 0) return specs;

  const hasAnyHighlighted = specs.some((spec) => spec.highlight === true);

  return hasAnyHighlighted
    ? specs.filter((spec) => spec.highlight === true)
    : specs;
};

export { getSpecIcon, computeSpecs, getHighlightedSpecs };
