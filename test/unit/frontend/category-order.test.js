import { describe } from "bun:test";
import { getCategoryOrder } from "#config/list-config.js";
import categoryOrder from "#data/categoryOrder.js";
import { defineOrderTests } from "#test/unit/frontend/order-test-helpers.js";

const DEFAULT_CATEGORY_ORDER = [
  "category-title.html",
  "category-parent-link.html",
  "category-content.html",
  "category-faqs.html",
  "category-subcategories.html",
  "category-products.html",
  "category-below-products.html",
];

describe("category-order", () => {
  defineOrderTests({
    order: categoryOrder,
    defaultOrder: DEFAULT_CATEGORY_ORDER,
    getOrder: getCategoryOrder,
    name: "categoryOrder",
    sampleItems: ["category-products.html", "category-content.html"],
  });
});
