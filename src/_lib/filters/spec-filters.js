import specsIcons from "#data/specs_icons.js";
import { inlineAsset } from "#media/inline-asset.js";

/**
 * Get the icon SVG content for a spec name
 * Normalizes the spec name (lowercase, trimmed) before lookup
 * @param {string} specName - The spec name to look up
 * @returns {string} - The icon SVG content or empty string if not found
 */
const getSpecIcon = (specName) => {
  if (!specName) return "";
  const normalized = specName.toLowerCase().trim();
  const iconFile = specsIcons[normalized];
  if (!iconFile) return "";
  return inlineAsset(`icons/${iconFile}`);
};

/**
 * Transform specs array to include icon content
 * @param {Object} data - Eleventy data object
 * @returns {Array|undefined} - Specs array with icon property added
 */
const computeSpecs = (data) => {
  if (!data.specs) return undefined;
  return data.specs.map((spec) => ({
    ...spec,
    icon: getSpecIcon(spec.name),
  }));
};

export { getSpecIcon, computeSpecs };
