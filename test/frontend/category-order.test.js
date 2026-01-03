import { describe, expect, test } from "bun:test";
import categoryOrder from "#data/categoryOrder.js";

const { DEFAULT_ORDER, getCategoryOrder } = categoryOrder._helpers;

describe("category-order", () => {
  // Default export tests (uses actual config)
  test("categoryOrder exports an array", () => {
    expect(Array.isArray(categoryOrder)).toBe(true);
  });

  test("categoryOrder is not empty", () => {
    expect(categoryOrder.length > 0).toBe(true);
  });

  test("categoryOrder contains only valid section names", () => {
    for (const section of categoryOrder) {
      expect(DEFAULT_ORDER.includes(section)).toBe(true);
    }
  });

  // DEFAULT_ORDER constant tests
  test("DEFAULT_ORDER contains the four expected section names", () => {
    expect(DEFAULT_ORDER).toEqual([
      "content",
      "faqs",
      "subcategories",
      "products",
    ]);
  });

  // getCategoryOrder function tests - covers all branches
  test("getCategoryOrder returns the input when it is a valid array", () => {
    const customOrder = ["products", "content"];
    const result = getCategoryOrder(customOrder);
    expect(result).toEqual(customOrder);
  });

  test("getCategoryOrder returns DEFAULT_ORDER when input is empty", () => {
    const result = getCategoryOrder([]);
    expect(result).toEqual(DEFAULT_ORDER);
  });

  test("getCategoryOrder returns DEFAULT_ORDER when input is null", () => {
    const result = getCategoryOrder(null);
    expect(result).toEqual(DEFAULT_ORDER);
  });

  test("getCategoryOrder returns DEFAULT_ORDER when input is undefined", () => {
    const result = getCategoryOrder(undefined);
    expect(result).toEqual(DEFAULT_ORDER);
  });

  test("getCategoryOrder returns DEFAULT_ORDER when input is string", () => {
    const result = getCategoryOrder("not-an-array");
    expect(result).toEqual(DEFAULT_ORDER);
  });

  test("getCategoryOrder returns DEFAULT_ORDER when input is object", () => {
    const result = getCategoryOrder({ order: ["products"] });
    expect(result).toEqual(DEFAULT_ORDER);
  });

  test("getCategoryOrder returns single-element arrays", () => {
    const singleElement = ["products"];
    const result = getCategoryOrder(singleElement);
    expect(result).toEqual(singleElement);
  });
});
