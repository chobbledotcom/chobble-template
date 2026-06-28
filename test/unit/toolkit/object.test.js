/**
 * Tests for js-toolkit frozen object utilities
 */
import { describe, expect, test } from "bun:test";
import {
  fromPairs,
  frozenObject,
  mapEntries,
  mapObject,
  pickNonNull,
  toObject,
} from "#toolkit/fp/object.js";

describe("frozenObject", () => {
  test("allows reading properties", () => {
    const obj = frozenObject({ a: 1, b: 2 });

    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
  });

  test("throws TypeError on property assignment", () => {
    const obj = frozenObject({ value: 42 });

    expect(() => {
      obj.value = 100;
    }).toThrow("Cannot set property 'value' on a frozen object");
  });

  test("throws TypeError on property deletion", () => {
    const obj = frozenObject({ key: "value" });

    expect(() => {
      delete obj.key;
    }).toThrow("Cannot delete property 'key' from a frozen object");
  });

  test("throws TypeError on defineProperty", () => {
    const obj = frozenObject({ a: 1 });

    expect(() => {
      Object.defineProperty(obj, "b", { value: 2 });
    }).toThrow("Cannot define property 'b' on a frozen object");
  });

  test("maps object entries with separate key/value args", () => {
    const entries = mapEntries((k, v) => `${k}:${v}`)({
      a: 1,
      b: 2,
    });

    expect(entries).toEqual(["a:1", "b:2"]);
  });

  test("maps object entries to a new object", () => {
    const result = mapObject((k, v) => [`${k}_mapped`, v * 2])({
      a: 1,
      b: 2,
    });

    expect(result).toEqual({ a_mapped: 2, b_mapped: 4 });
  });

  test("builds objects from pairs and toObject", () => {
    expect(
      fromPairs([
        ["a", 1],
        ["b", 2],
      ]),
    ).toEqual({ a: 1, b: 2 });

    const payload = toObject(
      [
        { key: "k1", value: "v1" },
        { key: "k2", value: "v2" },
      ],
      (item) => [item.key, item.value],
    );
    expect(payload).toEqual({ k1: "v1", k2: "v2" });
  });

  test("removes nulls and keeps falsey values with pickNonNull", () => {
    expect(pickNonNull({ a: 1, b: null, c: false, d: "", e: 0 })).toEqual({
      a: 1,
      c: false,
      d: "",
      e: 0,
    });
  });
});
