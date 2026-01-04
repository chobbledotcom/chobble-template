import { describe, expect, test } from "bun:test";
import {
  chunk,
  compact,
  findDuplicate,
  listSeparator,
  pick,
} from "#utils/array-utils.js";

describe("array-utils", () => {
  // ============================================
  // chunk Tests
  // ============================================
  test("Splits array into chunks of specified size", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test("Drops incomplete chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(chunk(["a", "b", "c"], 2)).toEqual([["a", "b"]]);
  });

  test("Returns empty array when input too small for one chunk", () => {
    expect(chunk([1], 2)).toEqual([]);
  });

  // ============================================
  // pick Tests
  // ============================================
  test("Picks specified keys from object", () => {
    expect(pick(["a", "c"])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  test("Ignores keys not in object", () => {
    expect(pick(["a", "missing"])({ a: 1, b: 2 })).toEqual({ a: 1 });
  });

  test("Works with map for array of objects", () => {
    const users = [
      { name: "Alice", age: 30, role: "admin" },
      { name: "Bob", age: 25, role: "user" },
    ];
    expect(users.map(pick(["name", "age"]))).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  // ============================================
  // compact Tests
  // ============================================
  test("Removes falsy values from array", () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
  });

  test("Removes false, 0, empty string, NaN", () => {
    expect(compact([1, false, 2, 0, 3, "", NaN])).toEqual([1, 2, 3]);
  });

  test("Works with conditional elements", () => {
    const condition = false;
    expect(compact([condition && "value", "always"])).toEqual(["always"]);
  });

  // ============================================
  // listSeparator Tests
  // ============================================
  test("Returns comma for most items", () => {
    const sep = listSeparator(4);
    expect(sep(0)).toBe(", ");
    expect(sep(1)).toBe(", ");
  });

  test("Returns 'and' for second-to-last item", () => {
    const sep = listSeparator(3);
    expect(sep(1)).toBe(" and ");
  });

  test("Returns empty string for last item", () => {
    const sep = listSeparator(3);
    expect(sep(2)).toBe("");
  });

  // ============================================
  // findDuplicate Tests
  // ============================================
  test("Finds first duplicate value in simple array", () => {
    expect(findDuplicate([1, 2, 1])).toBe(1);
    expect(findDuplicate([1, 2, 3, 2, 1])).toBe(2);
  });

  test("Returns undefined when no duplicates exist", () => {
    expect(findDuplicate([1, 2, 3])).toBe(undefined);
    expect(findDuplicate([])).toBe(undefined);
  });

  test("Finds duplicate using key extractor", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const duplicate = findDuplicate(items, (x) => x.id);

    expect(duplicate).toEqual({ id: 1 });
    expect(duplicate).toBe(items[2]); // Returns the duplicate item itself
  });

  test("Returns first duplicate when multiple exist", () => {
    expect(findDuplicate([1, 2, 1, 3, 2])).toBe(1);
  });

  test("Works with string values", () => {
    expect(findDuplicate(["a", "b", "a"])).toBe("a");
    expect(findDuplicate(["a", "b", "c"])).toBe(undefined);
  });

  test("Works with objects using nested key", () => {
    const options = [
      { days: 1, price: 10 },
      { days: 3, price: 25 },
      { days: 1, price: 15 },
    ];

    const duplicate = findDuplicate(options, (opt) => opt.days);
    expect(duplicate.days).toBe(1);
    expect(duplicate.price).toBe(15); // It's the second occurrence
  });
});
