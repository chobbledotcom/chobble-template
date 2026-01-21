/**
 * Tests for js-toolkit frozen object utilities
 */
import { describe, expect, test } from "bun:test";
import { frozenObject } from "#toolkit/fp/object.js";

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
});
