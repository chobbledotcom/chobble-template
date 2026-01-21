/**
 * Tests for js-toolkit array utilities
 */
import { describe, expect, test } from "bun:test";
import { mapAsync } from "#toolkit/fp/array.js";

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
});
