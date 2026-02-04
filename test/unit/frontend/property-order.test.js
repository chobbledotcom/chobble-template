import { describe } from "bun:test";
import propertyOrder from "#data/propertyOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

const { DEFAULT_ORDER, getPropertyOrder } = propertyOrder._helpers;

describe("property-order", () => {
  defineOrderTests({
    order: propertyOrder,
    defaultOrder: DEFAULT_ORDER,
    getOrder: getPropertyOrder,
    name: "propertyOrder",
    sampleItems: [
      "design-system/property-gallery.html",
      "design-system/property-content.html",
    ],
  });
});
