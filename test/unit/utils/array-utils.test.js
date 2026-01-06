import { describe, expect, test } from "bun:test";
import {
  chunk,
  compact,
  filterMap,
  findDuplicate,
  listSeparator,
  memberOf,
  notMemberOf,
  pick,
  pipe,
  sort,
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

  // ============================================
  // memberOf Tests
  // ============================================
  test("memberOf returns true for values in collection", () => {
    const isWeekend = memberOf(["saturday", "sunday"]);
    expect(isWeekend("saturday")).toBe(true);
    expect(isWeekend("sunday")).toBe(true);
  });

  test("memberOf returns false for values not in collection", () => {
    const isWeekend = memberOf(["saturday", "sunday"]);
    expect(isWeekend("monday")).toBe(false);
    expect(isWeekend("friday")).toBe(false);
  });

  test("memberOf works with filter", () => {
    const validCodes = memberOf(["A1", "B2", "C3"]);
    const codes = ["A1", "X9", "B2", "Z0", "C3"];
    expect(codes.filter(validCodes)).toEqual(["A1", "B2", "C3"]);
  });

  test("memberOf works with some", () => {
    const hasFruit = memberOf(["apple", "banana", "orange"]);
    expect(["carrot", "banana", "potato"].some(hasFruit)).toBe(true);
    expect(["carrot", "broccoli", "potato"].some(hasFruit)).toBe(false);
  });

  test("memberOf works with every", () => {
    const isDigit = memberOf([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
    expect(["1", "2", "3"].every(isDigit)).toBe(true);
    expect(["1", "a", "3"].every(isDigit)).toBe(false);
  });

  test("memberOf works with numbers", () => {
    const isPrime = memberOf([2, 3, 5, 7, 11, 13]);
    expect(isPrime(7)).toBe(true);
    expect(isPrime(4)).toBe(false);
  });

  test("memberOf handles empty collection", () => {
    const isEmpty = memberOf([]);
    expect(isEmpty("anything")).toBe(false);
  });

  // ============================================
  // notMemberOf Tests
  // ============================================
  test("notMemberOf returns true for values not in collection", () => {
    const isNotReserved = notMemberOf(["admin", "root", "system"]);
    expect(isNotReserved("user")).toBe(true);
    expect(isNotReserved("guest")).toBe(true);
  });

  test("notMemberOf returns false for values in collection", () => {
    const isNotReserved = notMemberOf(["admin", "root", "system"]);
    expect(isNotReserved("admin")).toBe(false);
    expect(isNotReserved("root")).toBe(false);
  });

  test("notMemberOf works with filter to exclude items", () => {
    const isNotExcluded = notMemberOf(["spam", "trash"]);
    const folders = ["inbox", "spam", "drafts", "trash", "sent"];
    expect(folders.filter(isNotExcluded)).toEqual(["inbox", "drafts", "sent"]);
  });

  test("notMemberOf handles empty collection", () => {
    const isNotEmpty = notMemberOf([]);
    expect(isNotEmpty("anything")).toBe(true);
  });

  test("notMemberOf is the logical inverse of memberOf", () => {
    const values = ["a", "b", "c"];
    const isMember = memberOf(values);
    const isNotMember = notMemberOf(values);

    for (const v of ["a", "b", "c", "d", "e"]) {
      expect(isNotMember(v)).toBe(!isMember(v));
    }
  });

  // ============================================
  // filterMap Tests
  // ============================================
  test("filterMap filters and maps in one pass", () => {
    const numbers = [1, -2, 3, -4, 5];
    const result = filterMap(
      (n) => n > 0,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([2, 6, 10]);
  });

  test("filterMap returns empty array when nothing matches", () => {
    const numbers = [1, 2, 3];
    const result = filterMap(
      (n) => n > 10,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([]);
  });

  test("filterMap transforms all items when all match predicate", () => {
    const numbers = [1, 2, 3];
    const result = filterMap(
      () => true,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([2, 4, 6]);
  });

  test("filterMap works with objects", () => {
    const users = [
      { name: "Alice", active: true },
      { name: "Bob", active: false },
      { name: "Charlie", active: true },
    ];
    const result = filterMap(
      (user) => user.active,
      (user) => user.name,
    )(users);
    expect(result).toEqual(["Alice", "Charlie"]);
  });

  test("filterMap handles empty arrays", () => {
    const result = filterMap(
      () => true,
      (x) => x,
    )([]);
    expect(result).toEqual([]);
  });

  test("filterMap works with pipe", () => {
    const numbers = [5, -3, 1, -7, 4, 2];
    const result = pipe(
      filterMap(
        (n) => n > 0,
        (n) => n * 10,
      ),
      sort((a, b) => a - b),
    )(numbers);
    expect(result).toEqual([10, 20, 40, 50]);
  });

  test("filterMap is curried for reuse", () => {
    const getActiveNames = filterMap(
      (user) => user.active,
      (user) => user.name,
    );

    const team1 = [
      { name: "A", active: true },
      { name: "B", active: false },
    ];
    const team2 = [
      { name: "C", active: false },
      { name: "D", active: true },
    ];

    expect(getActiveNames(team1)).toEqual(["A"]);
    expect(getActiveNames(team2)).toEqual(["D"]);
  });
});
