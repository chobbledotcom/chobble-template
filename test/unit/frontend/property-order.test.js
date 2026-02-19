import { describe } from "bun:test";
import {
  DEFAULT_PROPERTY_ORDER,
  getPropertyOrder,
} from "#config/list-config.js";
import propertyOrder from "#data/propertyOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

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
