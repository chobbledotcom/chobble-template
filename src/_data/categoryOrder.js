import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = ["content", "faqs", "subcategories", "products"];

const getCategoryOrder = (configOrder) =>
  Array.isArray(configOrder) && configOrder.length > 0
    ? configOrder
    : DEFAULT_ORDER;

const categoryOrder = getCategoryOrder(configJson.category_order);
// @ts-expect-error - Adding helper methods for tests (Eleventy breaks with multiple exports)
categoryOrder._helpers = { DEFAULT_ORDER, getCategoryOrder };

export default categoryOrder;
