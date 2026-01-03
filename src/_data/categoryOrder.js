import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = ["content", "faqs", "subcategories", "products"];

/**
 * Computes the category order from a config value.
 * Returns the config value if it's a non-empty array, otherwise DEFAULT_ORDER.
 */
const getCategoryOrder = (configOrder) =>
  Array.isArray(configOrder) && configOrder.length > 0
    ? configOrder
    : DEFAULT_ORDER;

// For Eleventy data, we need to export ONLY the result, not as default export
// because Eleventy with ES modules exposes all exports as object properties
const categoryOrder = getCategoryOrder(configJson.category_order);

// Export helpers for tests via a separate property that won't interfere
categoryOrder._helpers = { DEFAULT_ORDER, getCategoryOrder };

export default categoryOrder;
