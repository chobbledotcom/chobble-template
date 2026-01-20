/**
 * Tests for js-toolkit frozen set utilities
 */
import { describe, expect, test } from "bun:test";
import { frozenSet, frozenSetFrom, setHas, setLacks } from "#toolkit/fp/set.js";

describe("frozenSet", () => {
  test("creates a Set from array values", () => {
    const set = frozenSet(["a", "b", "c"]);

    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set.has("c")).toBe(true);
    expect(set.has("d")).toBe(false);
  });

  test("deduplicates values", () => {
    const set = frozenSet(["a", "b", "a", "c", "b"]);

    expect(set.size).toBe(3);
  });

  test("passes instanceof Set check", () => {
    const set = frozenSet(["a", "b"]);

    expect(set instanceof Set).toBe(true);
  });

  test("throws TypeError on add()", () => {
    const set = frozenSet(["a", "b"]);

    expect(() => set.add("c")).toThrow(TypeError);
    expect(() => set.add("c")).toThrow("Cannot call add() on a frozen set");
  });

  test("throws TypeError on delete()", () => {
    const set = frozenSet(["a", "b"]);

    expect(() => set.delete("a")).toThrow(TypeError);
    expect(() => set.delete("a")).toThrow(
      "Cannot call delete() on a frozen set",
    );
  });

  test("throws TypeError on clear()", () => {
    const set = frozenSet(["a", "b"]);

    expect(() => set.clear()).toThrow(TypeError);
    expect(() => set.clear()).toThrow("Cannot call clear() on a frozen set");
  });

  test("handles empty array", () => {
    const set = frozenSet([]);

    expect(set.size).toBe(0);
    expect(set.has("anything")).toBe(false);
  });

  test("works with numbers", () => {
    const set = frozenSet([1, 2, 3]);

    expect(set.has(1)).toBe(true);
    expect(set.has(4)).toBe(false);
  });

  test("supports iteration with for...of", () => {
    const set = frozenSet(["x", "y", "z"]);
    const values = [];

    for (const v of set) {
      values.push(v);
    }

    expect(values).toEqual(["x", "y", "z"]);
  });

  test("supports spread operator", () => {
    const set = frozenSet([1, 2, 3]);

    expect([...set]).toEqual([1, 2, 3]);
  });
});

describe("frozenSetFrom", () => {
  test("creates a frozen set from an iterable", () => {
    const map = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const set = frozenSetFrom(map.keys());

    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set instanceof Set).toBe(true);
  });

  test("creates from another Set", () => {
    const original = new Set([1, 2, 3]);
    const frozen = frozenSetFrom(original);

    expect(frozen.has(1)).toBe(true);
    expect(frozen.has(2)).toBe(true);
    expect(frozen.has(3)).toBe(true);
    expect(() => frozen.add(4)).toThrow(TypeError);
  });

  test("creates from a generator", () => {
    function* gen() {
      yield "x";
      yield "y";
      yield "z";
    }
    const set = frozenSetFrom(gen());

    expect(set.has("x")).toBe(true);
    expect(set.has("y")).toBe(true);
    expect(set.has("z")).toBe(true);
    expect(set.size).toBe(3);
  });
});

describe("setHas", () => {
  test("returns membership predicate function", () => {
    const set = frozenSet(["read", "write", "delete"]);
    const isAllowed = setHas(set);

    expect(isAllowed("read")).toBe(true);
    expect(isAllowed("write")).toBe(true);
    expect(isAllowed("admin")).toBe(false);
  });

  test("works with filter", () => {
    const VALID = frozenSet(["a", "b", "c"]);
    const items = ["a", "x", "b", "y", "c"];

    const filtered = items.filter(setHas(VALID));

    expect(filtered).toEqual(["a", "b", "c"]);
  });

  test("works with regular (non-frozen) sets", () => {
    const set = new Set([1, 2, 3]);
    const hasValue = setHas(set);

    expect(hasValue(1)).toBe(true);
    expect(hasValue(4)).toBe(false);
  });
});

describe("setLacks", () => {
  test("returns negated membership predicate function", () => {
    const BLOCKED = frozenSet(["admin", "root"]);
    const isNotBlocked = setLacks(BLOCKED);

    expect(isNotBlocked("user")).toBe(true);
    expect(isNotBlocked("guest")).toBe(true);
    expect(isNotBlocked("admin")).toBe(false);
    expect(isNotBlocked("root")).toBe(false);
  });

  test("works with filter to exclude values", () => {
    const EXCLUDE = frozenSet([2, 4]);
    const numbers = [1, 2, 3, 4, 5];

    const filtered = numbers.filter(setLacks(EXCLUDE));

    expect(filtered).toEqual([1, 3, 5]);
  });
});
