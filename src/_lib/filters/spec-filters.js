import specsIcons from "#data/specs-icons.json" with { type: "json" };
import { inlineAsset } from "#media/inline-asset.js";

const specsIconsOrder = Object.keys(specsIcons);

/**
 * @typedef {Object} ComputedSpec
 * @property {string} name - The spec name (guaranteed by PagesCMS schema)
 * @property {string} value - The spec value (guaranteed by PagesCMS schema)
 * @property {string} icon - Inline SVG icon HTML
 * @property {boolean} highlight - Whether to highlight this spec
 * @property {boolean} list_items - Whether to show this spec in list items
 */

/**
 * Transform specs array to include icon and highlight properties
 *
 * @param {{ specs?: import("#lib/types/pages-cms-generated").PagesCMSSpec[] }} data - Eleventy data object
 * @returns {ComputedSpec[]} - Specs array with icon and highlight properties added
 *
 * PagesCMS guarantees: If specs array exists, each item has required name and value fields.
 * Therefore, no optional chaining needed on spec.name.
 * See: .pages.yml schema, generated via scripts/generate-pages-cms-types.js
 */
const computeSpecs = (data) => {
  if (!data.specs) return [];
  return data.specs.map((spec) => {
    // spec.name is guaranteed to be a non-empty string by PagesCMS schema
    const normalized = spec.name.toLowerCase().trim();
    const config = normalized ? specsIcons[normalized] : undefined;
    return {
      ...spec,
      icon: config ? inlineAsset(`icons/${config.icon}`) : "",
      highlight: config?.highlight ?? false,
      list_items: config?.list_items ?? false,
    };
  });
};

/**
 * Filter specs to only show highlighted ones if any spec has highlight set
 * If no specs have highlight: true, returns all specs
 * @param {ComputedSpec[]} specs - Array of spec objects with highlight property
 * @returns {ComputedSpec[]} - Filtered specs array
 */
const getHighlightedSpecs = (specs) => {
  if (specs.length === 0) return specs;

  const hasAnyHighlighted = specs.some((spec) => spec.highlight === true);

  return hasAnyHighlighted
    ? specs.filter((spec) => spec.highlight === true)
    : specs;
};

/**
 * Get specs for list item display - filtered by list_items config,
 * sorted by order in specs-icons.json, limited to first 2
 * @param {ComputedSpec[]} specs - Array of computed spec objects
 * @returns {ComputedSpec[]} - Filtered and sorted specs array (max 2)
 */
const getListItemSpecs = (specs) => {
  if (specs.length === 0) return [];

  return specs
    .filter((spec) => spec.list_items === true)
    .sort((a, b) => {
      const aIndex = specsIconsOrder.indexOf(a.name.toLowerCase().trim());
      const bIndex = specsIconsOrder.indexOf(b.name.toLowerCase().trim());
      return aIndex - bIndex;
    })
    .slice(0, 2);
};

export { computeSpecs, getHighlightedSpecs, getListItemSpecs };
