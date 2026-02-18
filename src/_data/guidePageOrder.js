import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = [
  "guide/header.html",
  "guide/navigation.html",
  "guide/content.html",
  "guide/faqs.html",
];

const getGuidePageOrder = (configOrder) =>
  Array.isArray(configOrder) && configOrder.length > 0
    ? configOrder
    : DEFAULT_ORDER;

/**
 * @type {Array<string> & { _helpers?: { DEFAULT_ORDER: Array<string>, getGuidePageOrder: Function } }}
 */
const guidePageOrder = getGuidePageOrder(configJson.guide_page_order);
guidePageOrder._helpers = { DEFAULT_ORDER, getGuidePageOrder };

export default guidePageOrder;
