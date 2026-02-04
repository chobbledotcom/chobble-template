import { describe } from "bun:test";
import categoryOrder from "#data/categoryOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

const { DEFAULT_ORDER, getCategoryOrder } = categoryOrder._helpers;

describe("category-order", () => {
  defineOrderTests({
    order: categoryOrder,
    defaultOrder: DEFAULT_ORDER,
    getOrder: getCategoryOrder,
    name: "categoryOrder",
    sampleItems: ["category-products.html", "category-content.html"],
  });
});
