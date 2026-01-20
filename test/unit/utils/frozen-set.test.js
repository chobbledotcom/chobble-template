import { describe, expect, test } from "bun:test";
import { frozenSet } from "#toolkit/fp/set.js";

describe("frozenSet", () => {
  test("has() returns true for included values", () => {
    const tags = frozenSet(["a", "b", "c"]);
    expect(tags.has("a")).toBe(true);
    expect(tags.has("b")).toBe(true);
    expect(tags.has("c")).toBe(true);
  });

  test("has() returns false for non-included values", () => {
    const tags = frozenSet(["a", "b", "c"]);
    expect(tags.has("d")).toBe(false);
    expect(tags.has("")).toBe(false);
    expect(tags.has("A")).toBe(false);
  });

  test("values() returns array of all values", () => {
    const tags = frozenSet(["x", "y", "z"]);
    expect(tags.values()).toEqual(["x", "y", "z"]);
  });

  test("size returns correct count", () => {
    expect(frozenSet([]).size).toBe(0);
    expect(frozenSet(["a"]).size).toBe(1);
    expect(frozenSet(["a", "b", "c"]).size).toBe(3);
  });

  test("deduplicates input values", () => {
    const tags = frozenSet(["a", "b", "a", "c", "b"]);
    expect(tags.size).toBe(3);
    expect(tags.values()).toEqual(["a", "b", "c"]);
  });

  test("returns frozen object", () => {
    const tags = frozenSet(["a"]);
    expect(Object.isFrozen(tags)).toBe(true);
  });

  test("works with empty array", () => {
    const empty = frozenSet([]);
    expect(empty.has("anything")).toBe(false);
    expect(empty.values()).toEqual([]);
    expect(empty.size).toBe(0);
  });
});
