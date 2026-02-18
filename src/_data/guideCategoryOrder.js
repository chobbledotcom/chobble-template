import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = [
  "guide/header.html",
  "guide/content.html",
  "guide/guide-pages-list.html",
];

const getGuideCategoryOrder = (configOrder) =>
  Array.isArray(configOrder) && configOrder.length > 0
    ? configOrder
    : DEFAULT_ORDER;

/**
 * @type {Array<string> & { _helpers?: { DEFAULT_ORDER: Array<string>, getGuideCategoryOrder: Function } }}
 */
const guideCategoryOrder = getGuideCategoryOrder(
  configJson.guide_category_order,
);
guideCategoryOrder._helpers = { DEFAULT_ORDER, getGuideCategoryOrder };

export default guideCategoryOrder;
