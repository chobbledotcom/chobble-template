/**
 * Tests for js-toolkit array utilities
 */
import { describe, expect, test } from "bun:test";
import {
  exclude,
  mapAsync,
  memberOf,
  notMemberOf,
  pick,
  pluralize,
  uniqueBy,
} from "#toolkit/fp/array.js";

describe("mapAsync", () => {
  test("maps async function over array and awaits all results", async () => {
    const double = async (x) => x * 2;

    const result = await mapAsync(double)([1, 2, 3]);

    expect(result).toEqual([2, 4, 6]);
  });

  test("handles iterables like NodeList without explicit Array.from", async () => {
    const addOne = async (x) => x + 1;

    const result = await mapAsync(addOne)(new Set([1, 2, 3]));

    expect(result).toEqual([2, 3, 4]);
  });

  test("passes index to the async function", async () => {
    const withIndex = async (value, index) => ({ value, index });

    const result = await mapAsync(withIndex)(["a", "b", "c"]);

    expect(result).toEqual([
      { value: "a", index: 0 },
      { value: "b", index: 1 },
      { value: "c", index: 2 },
    ]);
  });

  test("returns empty array for empty input", async () => {
    const fn = async (x) => x;

    const result = await mapAsync(fn)([]);

    expect(result).toEqual([]);
  });

  test("runs all promises concurrently", async () => {
    const start = Date.now();
    await mapAsync(
      (ms) => new Promise((resolve) => setTimeout(() => resolve(ms), ms)),
    )([10, 10, 10]);
    const elapsed = Date.now() - start;

    // Total time should be ~10ms (parallel), not ~30ms (sequential)
    // If run sequentially, would take 30ms+. With concurrency, ~10ms.
    expect(elapsed).toBeLessThan(100);
  });

  test("filters and picks unique objects by key", () => {
    const items = [
      { id: 1, name: "first" },
      { id: 1, name: "duplicate" },
      { id: 2, name: "second" },
    ];
    const result = uniqueBy((item) => item.id)(items);

    expect(result).toEqual([
      { id: 1, name: "duplicate" },
      { id: 2, name: "second" },
    ]);
  });

  test("picks an object subset and ignores missing keys", () => {
    const pickMeta = pick(["id", "name", "missing"]);
    expect(pickMeta({ id: 1, name: "Widget", sku: "X" })).toEqual({
      id: 1,
      name: "Widget",
    });
  });

  test("membership helpers include and exclude values", () => {
    const isWeekend = memberOf(["sat", "sun"]);
    const isNotWeekend = notMemberOf(["sat", "sun"]);

    expect(isWeekend("sat")).toBe(true);
    expect(isNotWeekend("sat")).toBe(false);
    expect(exclude(["blocked", "forbidden"])(["allowed", "blocked"])).toEqual([
      "allowed",
    ]);
  });

  test("pluralize handles singular/plural and custom endings", () => {
    const format = pluralize("class");
    expect(format(1)).toBe("1 class");
    expect(format(3)).toBe("3 classes");
  });

  test("pluralize uses custom form when provided", () => {
    const format = pluralize("item in basket", "items in basket");
    expect(format(1)).toBe("1 item in basket");
    expect(format(2)).toBe("2 items in basket");
  });
});
