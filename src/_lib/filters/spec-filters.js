import specsIcons from "#data/specs-icons.json" with { type: "json" };
import { inlineAsset } from "#media/inline-asset.js";

/**
 * @typedef {Object} Spec
 * @property {string} name - The spec name
 * @property {string} [description] - Optional spec description
 */

/**
 * @typedef {Object} ComputedSpec
 * @property {string} name - The spec name
 * @property {string} [description] - Optional spec description
 * @property {string} icon - Inline SVG icon HTML
 * @property {boolean} highlight - Whether to highlight this spec
 */

/**
 * Transform specs array to include icon and highlight properties
 * @param {{ specs?: Spec[] }} data - Eleventy data object
 * @returns {ComputedSpec[] | undefined} - Specs array with icon and highlight properties added
 */
const computeSpecs = (data) => {
  if (!data.specs) return undefined;
  return data.specs.map((spec) => {
    const normalized = spec.name?.toLowerCase().trim();
    const config = normalized ? specsIcons[normalized] : undefined;
    return {
      ...spec,
      icon: config ? inlineAsset(`icons/${config.icon}`) : "",
      highlight: config?.highlight ?? false,
    };
  });
};

/**
 * Filter specs to only show highlighted ones if any spec has highlight set
 * If no specs have highlight: true, returns all specs
 * @param {ComputedSpec[] | undefined | null} specs - Array of spec objects with highlight property
 * @returns {ComputedSpec[]} - Filtered specs array
 */
const getHighlightedSpecs = (specs) => {
  if (!specs || specs.length === 0) return specs;

  const hasAnyHighlighted = specs.some((spec) => spec.highlight === true);

  return hasAnyHighlighted
    ? specs.filter((spec) => spec.highlight === true)
    : specs;
};

export { computeSpecs, getHighlightedSpecs };
