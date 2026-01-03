import categoryOrder from "#data/categoryOrder.js";
import { createTestRunner } from "#test/test-utils.js";

const DEFAULT_ORDER = ["content", "faqs", "subcategories", "products"];

const testCases = [
  {
    name: "categoryOrder-is-array",
    description: "categoryOrder exports an array",
    test: () => {
      if (!Array.isArray(categoryOrder)) {
        throw new Error("categoryOrder should be an array");
      }
    },
  },
  {
    name: "categoryOrder-not-empty",
    description: "categoryOrder is not empty",
    test: () => {
      if (categoryOrder.length === 0) {
        throw new Error("categoryOrder should not be empty");
      }
    },
  },
  {
    name: "categoryOrder-valid-sections",
    description: "categoryOrder contains only valid section names",
    test: () => {
      for (const section of categoryOrder) {
        if (!DEFAULT_ORDER.includes(section)) {
          throw new Error(`Invalid section name: ${section}`);
        }
      }
    },
  },
];

export default createTestRunner("category-order", testCases);
