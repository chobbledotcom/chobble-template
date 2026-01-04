import { describe, expect, test } from "bun:test";
import {
  everyEntry,
  filterObject,
  mapBoth,
  mapEntries,
  mapObject,
  pickTruthy,
} from "#utils/object-entries.js";

describe("object-entries utilities", () => {
  const testObj = { a: 1, b: 2, c: 3 };

  describe("mapEntries", () => {
    test("maps entries with (key, value) callback", () => {
      const toStrings = mapEntries((k, v) => `${k}=${v}`);
      expect(toStrings(testObj)).toEqual(["a=1", "b=2", "c=3"]);
    });

    test("works with empty object", () => {
      const double = mapEntries((k, v) => v * 2);
      expect(double({})).toEqual([]);
    });
  });

  describe("everyEntry", () => {
    test("returns true when all entries match", () => {
      const allPositive = everyEntry((k, v) => v > 0);
      expect(allPositive(testObj)).toBe(true);
    });

    test("returns false when any entry fails", () => {
      const allLarge = everyEntry((k, v) => v > 2);
      expect(allLarge(testObj)).toBe(false);
    });

    test("returns true for empty object", () => {
      const anyCheck = everyEntry(() => false);
      expect(anyCheck({})).toBe(true);
    });

    test("receives key and value as separate args", () => {
      const keysAndValues = [];
      everyEntry((k, v) => {
        keysAndValues.push([k, v]);
        return true;
      })({ x: 10, y: 20 });
      expect(keysAndValues).toEqual([
        ["x", 10],
        ["y", 20],
      ]);
    });
  });

  describe("mapObject", () => {
    test("transforms keys and values", () => {
      const uppercase = mapObject((k, v) => [k.toUpperCase(), v * 2]);
      expect(uppercase(testObj)).toEqual({ A: 2, B: 4, C: 6 });
    });

    test("can swap keys and values", () => {
      const swap = mapObject((k, v) => [String(v), k]);
      expect(swap(testObj)).toEqual({ 1: "a", 2: "b", 3: "c" });
    });
  });

  describe("filterObject", () => {
    test("filters entries and returns object", () => {
      const keepPositive = filterObject((k, v) => v > 1);
      expect(keepPositive(testObj)).toEqual({ b: 2, c: 3 });
    });

    test("can filter by key", () => {
      const notA = filterObject((k) => k !== "a");
      expect(notA(testObj)).toEqual({ b: 2, c: 3 });
    });

    test("returns empty object when nothing matches", () => {
      const keepHuge = filterObject((k, v) => v > 100);
      expect(keepHuge(testObj)).toEqual({});
    });
  });

  describe("mapBoth", () => {
    test("applies same transform to keys and values", () => {
      const lower = mapBoth((s) => s.toLowerCase());
      expect(lower({ FOO: "BAR", BAZ: "QUX" })).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    test("works with number transform", () => {
      const double = mapBoth((n) => n * 2);
      expect(double({ 1: 2, 3: 4 })).toEqual({ 2: 4, 6: 8 });
    });
  });

  describe("pickTruthy", () => {
    test("keeps only truthy values", () => {
      expect(pickTruthy({ a: 1, b: null, c: 0, d: "x", e: "" })).toEqual({
        a: 1,
        d: "x",
      });
    });

    test("returns empty object when all falsy", () => {
      expect(pickTruthy({ a: null, b: 0, c: "" })).toEqual({});
    });
  });

  describe("real-world patterns", () => {
    test("building CSS variable lines", () => {
      const vars = { "--color-bg": "#fff", "--color-text": "#000" };
      const toLine = mapEntries((name, value) => `  ${name}: ${value};`);
      expect(toLine(vars).join("\n")).toBe(
        "  --color-bg: #fff;\n  --color-text: #000;",
      );
    });

    test("checking all filters match", () => {
      const itemAttrs = { size: "small", color: "red" };
      const filters = { size: "small" };
      const matches = everyEntry((k, v) => itemAttrs[k] === v);
      expect(matches(filters)).toBe(true);
    });

    test("normalizing object with mapBoth", () => {
      const normalize = (s) => s.toLowerCase().replace(/\s+/g, "-");
      expect(mapBoth(normalize)({ "Size Type": "Extra Large" })).toEqual({
        "size-type": "extra-large",
      });
    });

    test("extracting enabled features", () => {
      const config = { featureA: true, featureB: false, featureC: true };
      expect(pickTruthy(config)).toEqual({ featureA: true, featureC: true });
    });
  });
});
