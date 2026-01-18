import { describe, expect, test } from "bun:test";
import {
  everyEntry,
  fromPairs,
  mapBoth,
  mapEntries,
  pickNonNull,
  pickTruthy,
  toObject,
} from "#utils/object-entries.js";

describe("object-entries utilities", () => {
  const testObj = { a: 1, b: 2, c: 3 };

  describe("mapEntries", () => {
    test("maps entries with (key, value) callback", () => {
      const toStrings = mapEntries((k, v) => `${k}=${v}`);
      expect(toStrings(testObj)).toEqual(["a=1", "b=2", "c=3"]);
    });

    test("works with empty object", () => {
      const double = mapEntries((_k, v) => v * 2);
      expect(double({})).toEqual([]);
    });
  });

  describe("everyEntry", () => {
    test("returns true when all entries match", () => {
      const allPositive = everyEntry((_k, v) => v > 0);
      expect(allPositive(testObj)).toBe(true);
    });

    test("returns false when any entry fails", () => {
      const allLarge = everyEntry((_k, v) => v > 2);
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

  describe("pickNonNull", () => {
    test("keeps values that are not null", () => {
      expect(pickNonNull({ a: 1, b: null, c: 0, d: "x", e: "" })).toEqual({
        a: 1,
        c: 0,
        d: "x",
        e: "",
      });
    });

    test("keeps false values", () => {
      expect(pickNonNull({ enabled: false, disabled: null })).toEqual({
        enabled: false,
      });
    });

    test("returns empty object when all null", () => {
      expect(pickNonNull({ a: null, b: null, c: null })).toEqual({});
    });

    test("keeps undefined (only filters null)", () => {
      expect(pickNonNull({ a: undefined, b: null })).toEqual({ a: undefined });
    });
  });

  describe("toObject", () => {
    test("builds object from array using toEntry function", () => {
      const items = [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
      ];
      const result = toObject(items, (item) => [item.id, item.value]);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test("returns empty object for empty array", () => {
      expect(toObject([], (x) => [x, x])).toEqual({});
    });

    test("provides index as second argument", () => {
      const items = ["first", "second", "third"];
      const result = toObject(items, (item, i) => [item, i]);
      expect(result).toEqual({ first: 0, second: 1, third: 2 });
    });

    test("later entries overwrite earlier ones with same key", () => {
      const items = [
        { key: "x", value: 1 },
        { key: "x", value: 2 },
      ];
      const result = toObject(items, (item) => [item.key, item.value]);
      expect(result).toEqual({ x: 2 });
    });

    test("builds filename lookup from paths", () => {
      const images = [
        { path: "/images/photo.jpg", alt: "A photo" },
        { path: "/uploads/logo.png", alt: "Company logo" },
      ];
      const lookup = toObject(images, (img) => [
        img.path.split("/").pop(),
        img.alt,
      ]);
      expect(lookup).toEqual({
        "photo.jpg": "A photo",
        "logo.png": "Company logo",
      });
    });
  });

  describe("fromPairs", () => {
    test("builds object from array of pairs", () => {
      const pairs = [
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ];
      expect(fromPairs(pairs)).toEqual({ a: 1, b: 2, c: 3 });
    });

    test("returns empty object for empty array", () => {
      expect(fromPairs([])).toEqual({});
    });

    test("later entries overwrite earlier ones (last wins)", () => {
      const pairs = [
        ["x", 1],
        ["x", 2],
        ["x", 3],
      ];
      expect(fromPairs(pairs)).toEqual({ x: 3 });
    });

    test("reversing gives first-occurrence-wins", () => {
      const pairs = [
        ["x", "first"],
        ["x", "second"],
        ["x", "third"],
      ];
      expect(fromPairs(pairs.reverse())).toEqual({ x: "first" });
    });

    test("works with mixed key types", () => {
      const pairs = [
        ["string", "value1"],
        [1, "value2"],
      ];
      expect(fromPairs(pairs)).toEqual({ string: "value1", 1: "value2" });
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
      const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");
      expect(mapBoth(toSlug)({ "Size Type": "Extra Large" })).toEqual({
        "size-type": "extra-large",
      });
    });

    test("extracting enabled features", () => {
      const config = { featureA: true, featureB: false, featureC: true };
      expect(pickTruthy(config)).toEqual({ featureA: true, featureC: true });
    });

    test("building hire price lookup with toObject", () => {
      const hireOptions = [
        { days: 1, unit_price: 10 },
        { days: 3, unit_price: 25 },
        { days: 7, unit_price: 50 },
      ];
      const priceByDays = toObject(hireOptions, (opt) => [
        opt.days,
        opt.unit_price,
      ]);
      expect(priceByDays).toEqual({ 1: 10, 3: 25, 7: 50 });
    });
  });
});
