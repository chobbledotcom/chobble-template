import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import categoryOrder from "#data/categoryOrder.js";
import { ROOT_DIR } from "#lib/paths.js";

const { DEFAULT_ORDER, getCategoryOrder } = categoryOrder._helpers;
const INCLUDES_DIR = join(ROOT_DIR, "src/_includes");

describe("category-order", () => {
  // Default export tests (uses actual config)
  test("categoryOrder exports an array", () => {
    expect(Array.isArray(categoryOrder)).toBe(true);
  });

  test("categoryOrder is not empty", () => {
    expect(categoryOrder.length > 0).toBe(true);
  });

  test("categoryOrder contains only valid include files", () => {
    for (const section of categoryOrder) {
      expect(DEFAULT_ORDER.includes(section)).toBe(true);
    }
  });

  // DEFAULT_ORDER constant tests
  test("DEFAULT_ORDER is non-empty", () => {
    expect(DEFAULT_ORDER.length).toBeGreaterThan(0);
  });

  test("DEFAULT_ORDER files all exist in src/_includes", () => {
    for (const file of DEFAULT_ORDER) {
      const filePath = join(INCLUDES_DIR, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  // getCategoryOrder function tests - covers all branches
  test("getCategoryOrder returns the input when it is a valid array", () => {
    const customOrder = ["category-products.html", "category-content.html"];
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
    const singleElement = ["category-products.html"];
    const result = getCategoryOrder(singleElement);
    expect(result).toEqual(singleElement);
  });
});
