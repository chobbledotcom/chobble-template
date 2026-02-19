import { describe } from "bun:test";
import {
  DEFAULT_CATEGORY_ORDER,
  getCategoryOrder,
} from "#config/list-config.js";
import categoryOrder from "#data/categoryOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

describe("category-order", () => {
  defineOrderTests({
    order: categoryOrder,
    defaultOrder: DEFAULT_CATEGORY_ORDER,
    getOrder: getCategoryOrder,
    name: "categoryOrder",
    sampleItems: ["category-products.html", "category-content.html"],
  });
});
