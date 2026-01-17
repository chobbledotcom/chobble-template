/**
 * Dietary indicator definitions for menu items.
 *
 * Each indicator has:
 * - symbol: Short code displayed on menu (e.g., "VE", "GF")
 * - label: Full name for accessibility and tooltips
 * - field: Field name in menu item data (e.g., "is_vegan")
 *
 * Add new indicators by adding entries with the same structure.
 */
export default {
  vegan: {
    symbol: "VE",
    label: "Vegan",
    field: "is_vegan",
  },
  glutenFree: {
    symbol: "GF",
    label: "Gluten Free",
    field: "is_gluten_free",
  },
};
