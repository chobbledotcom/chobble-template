import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = ["content", "faqs", "subcategories", "products"];

const configOrder = configJson.category_order;

export default Array.isArray(configOrder) && configOrder.length > 0
  ? configOrder
  : DEFAULT_ORDER;
