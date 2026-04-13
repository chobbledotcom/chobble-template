import { describe } from "bun:test";
import { getPropertyOrder } from "#config/list-config.js";
import propertyOrder from "#data/propertyOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

describe("property-order", () => {
  defineOrderTests({
    order: propertyOrder,
    getOrder: getPropertyOrder,
    name: "propertyOrder",
    sampleItems: ["property/gallery.html", "property/content.html"],
  });
});
