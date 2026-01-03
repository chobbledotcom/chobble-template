import categoryOrder from "#data/categoryOrder.js";

const { DEFAULT_ORDER, getCategoryOrder } = categoryOrder._helpers;

import {
  createTestRunner,
  expectDeepEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // Default export tests (uses actual config)
  {
    name: "categoryOrder-is-array",
    description: "categoryOrder exports an array",
    test: () => {
      expectTrue(Array.isArray(categoryOrder), "categoryOrder should be array");
    },
  },
  {
    name: "categoryOrder-not-empty",
    description: "categoryOrder is not empty",
    test: () => {
      expectTrue(
        categoryOrder.length > 0,
        "categoryOrder should have at least one element",
      );
    },
  },
  {
    name: "categoryOrder-valid-sections",
    description: "categoryOrder contains only valid section names",
    test: () => {
      for (const section of categoryOrder) {
        expectTrue(
          DEFAULT_ORDER.includes(section),
          `Section "${section}" should be a valid section name`,
        );
      }
    },
  },

  // DEFAULT_ORDER constant tests
  {
    name: "default-order-has-expected-values",
    description: "DEFAULT_ORDER contains the four expected section names",
    test: () => {
      expectDeepEqual(
        DEFAULT_ORDER,
        ["content", "faqs", "subcategories", "products"],
        "DEFAULT_ORDER should have content, faqs, subcategories, products",
      );
    },
  },

  // getCategoryOrder function tests - covers all branches
  {
    name: "getCategoryOrder-returns-valid-array",
    description: "getCategoryOrder returns the input when it is a valid array",
    test: () => {
      const customOrder = ["products", "content"];
      const result = getCategoryOrder(customOrder);
      expectDeepEqual(
        result,
        customOrder,
        "Should return the custom order array",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-default-for-empty-array",
    description: "getCategoryOrder returns DEFAULT_ORDER when input is empty",
    test: () => {
      const result = getCategoryOrder([]);
      expectDeepEqual(
        result,
        DEFAULT_ORDER,
        "Should return DEFAULT_ORDER for empty array",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-default-for-null",
    description: "getCategoryOrder returns DEFAULT_ORDER when input is null",
    test: () => {
      const result = getCategoryOrder(null);
      expectDeepEqual(
        result,
        DEFAULT_ORDER,
        "Should return DEFAULT_ORDER for null",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-default-for-undefined",
    description:
      "getCategoryOrder returns DEFAULT_ORDER when input is undefined",
    test: () => {
      const result = getCategoryOrder(undefined);
      expectDeepEqual(
        result,
        DEFAULT_ORDER,
        "Should return DEFAULT_ORDER for undefined",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-default-for-string",
    description: "getCategoryOrder returns DEFAULT_ORDER when input is string",
    test: () => {
      const result = getCategoryOrder("not-an-array");
      expectDeepEqual(
        result,
        DEFAULT_ORDER,
        "Should return DEFAULT_ORDER for string",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-default-for-object",
    description: "getCategoryOrder returns DEFAULT_ORDER when input is object",
    test: () => {
      const result = getCategoryOrder({ order: ["products"] });
      expectDeepEqual(
        result,
        DEFAULT_ORDER,
        "Should return DEFAULT_ORDER for object",
      );
    },
  },
  {
    name: "getCategoryOrder-returns-single-element-array",
    description: "getCategoryOrder returns single-element arrays",
    test: () => {
      const singleElement = ["products"];
      const result = getCategoryOrder(singleElement);
      expectDeepEqual(
        result,
        singleElement,
        "Should return single-element array",
      );
    },
  },
];

export default createTestRunner("category-order", testCases);
