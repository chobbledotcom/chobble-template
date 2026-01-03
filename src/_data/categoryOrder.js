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

export { DEFAULT_ORDER, getCategoryOrder };

export default getCategoryOrder(configJson.category_order);
