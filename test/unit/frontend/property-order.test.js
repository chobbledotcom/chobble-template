import { describe } from "bun:test";
import { getPropertyOrder } from "#config/list-config.js";
import propertyOrder from "#data/propertyOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

const DEFAULT_PROPERTY_ORDER = [
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

describe("property-order", () => {
  defineOrderTests({
    order: propertyOrder,
    defaultOrder: DEFAULT_PROPERTY_ORDER,
    getOrder: getPropertyOrder,
    name: "propertyOrder",
    sampleItems: [
      "design-system/property-gallery.html",
      "design-system/property-content.html",
    ],
  });
});
