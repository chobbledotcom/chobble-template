import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const INCLUDES_DIR = join(ROOT_DIR, "src/_includes");

/**
 * Creates standard tests for an order data module (categoryOrder, propertyOrder, etc).
 * @param {object} opts
 * @param {Array<string>} opts.order - The exported order array
 * @param {Array<string>} opts.defaultOrder - The DEFAULT_ORDER constant
 * @param {Function} opts.getOrder - The getXOrder function
 * @param {string} opts.name - Display name (e.g. "categoryOrder")
 * @param {Array<string>} opts.sampleItems - Two sample include paths for custom order test
 */
const defineOrderTests = ({
  order,
  defaultOrder,
  getOrder,
  name,
  sampleItems,
}) => {
  test(`${name} exports an array`, () => {
    expect(Array.isArray(order)).toBe(true);
  });

  test(`${name} is not empty`, () => {
    expect(order.length > 0).toBe(true);
  });

  test(`${name} contains only valid include files`, () => {
    for (const section of order) {
      expect(defaultOrder.includes(section)).toBe(true);
    }
  });

  test("DEFAULT_ORDER is non-empty", () => {
    expect(defaultOrder.length).toBeGreaterThan(0);
  });

  test("DEFAULT_ORDER files all exist in src/_includes", () => {
    for (const file of defaultOrder) {
      const filePath = join(INCLUDES_DIR, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  test("getOrder returns the input when it is a valid array", () => {
    const customOrder = sampleItems;
    const result = getOrder(customOrder);
    expect(result).toEqual(customOrder);
  });

  test("getOrder returns DEFAULT_ORDER when input is empty", () => {
    expect(getOrder([])).toEqual(defaultOrder);
  });

  test("getOrder returns DEFAULT_ORDER when input is null", () => {
    expect(getOrder(null)).toEqual(defaultOrder);
  });

  test("getOrder returns DEFAULT_ORDER when input is undefined", () => {
    expect(getOrder(undefined)).toEqual(defaultOrder);
  });

  test("getOrder returns DEFAULT_ORDER when input is string", () => {
    expect(getOrder("not-an-array")).toEqual(defaultOrder);
  });

  test("getOrder returns DEFAULT_ORDER when input is object", () => {
    expect(getOrder({ order: ["something"] })).toEqual(defaultOrder);
  });

  test("getOrder returns single-element arrays", () => {
    const singleElement = [sampleItems[0]];
    expect(getOrder(singleElement)).toEqual(singleElement);
  });
};

export { defineOrderTests };
