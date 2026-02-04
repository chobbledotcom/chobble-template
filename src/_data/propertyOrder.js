import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_ORDER = [
  "design-system/property-header.html",
  "design-system/property-gallery.html",
  "design-system/property-content.html",
  "design-system/property-features.html",
  "design-system/property-specs.html",
  "design-system/property-tabs.html",
  "design-system/property-map.html",
  "design-system/property-reviews.html",
  "design-system/property-faqs.html",
  "design-system/property-contact.html",
];

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
