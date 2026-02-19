import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = [
  "property/header.html",
  "property/freetobook.html",
  "property/gallery.html",
  "property/content.html",
  "property/features.html",
  "property/guides.html",
  "property/specs.html",
  "property/tabs.html",
  "property/map.html",
  "property/reviews.html",
  "faqs.html",
  "property/contact.html",
];

/** @param {unknown} configOrder */
const getPropertyOrder = (configOrder) =>
  Array.isArray(configOrder) && configOrder.length > 0
    ? configOrder
    : DEFAULT_ORDER;

/**
 * @type {Array<string> & { _helpers?: { DEFAULT_ORDER: Array<string>, getPropertyOrder: Function } }}
 */
const propertyOrder = getPropertyOrder(configJson.property_order);
propertyOrder._helpers = { DEFAULT_ORDER, getPropertyOrder };

export default propertyOrder;
