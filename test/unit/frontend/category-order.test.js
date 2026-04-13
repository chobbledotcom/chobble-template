import { describe } from "bun:test";
import { getCategoryOrder } from "#config/list-config.js";
import categoryOrder from "#data/categoryOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

describe("category-order", () => {
  defineOrderTests({
    order: categoryOrder,
    getOrder: getCategoryOrder,
    name: "categoryOrder",
    sampleItems: ["category-products.html", "category-content.html"],
  });
});
