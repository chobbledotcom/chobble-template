/**
 * Tests for the generic fp array helpers: pipe, the curried
 * Array-method wrappers, and the sequence utilities.
 *
 * The data-factory, picking, membership, and pluralization helpers are
 * covered in array-utils.test.js.
 */
import { describe, expect, test } from "vitest";
import {
  exclude,
  filter,
  flatMap,
  join,
  map,
  mapAsync,
  pipe,
  reduce,
  sort,
  split,
  unique,
} from "#utils/fp/array.js";

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

describe("pipe", () => {
  test("composes functions left to right", () => {
    const addOne = (x) => x + 1;
    const double = (x) => x * 2;

    expect(pipe(addOne, double)(3)).toBe(8);
    expect(pipe(double, addOne)(3)).toBe(7);
  });

  test("returns the input unchanged with no functions", () => {
    expect(pipe()("value")).toBe("value");
  });
});

describe("curried array helpers", () => {
  test("filter keeps items matching the predicate", () => {
    expect(filter((x) => x > 2)([1, 2, 3, 4])).toEqual([3, 4]);
  });

  test("map transforms each item and passes the index", () => {
    expect(map((x) => x * 3)([1, 2])).toEqual([3, 6]);
    expect(map((x, i) => `${i}:${x}`)(["a", "b"])).toEqual(["0:a", "1:b"]);
  });

  test("flatMap flattens one level of returned arrays", () => {
    expect(flatMap((x) => [x, x])([1, 2])).toEqual([1, 1, 2, 2]);
  });

  test("reduce folds the array from the initial value", () => {
    expect(reduce((acc, x) => acc + x, 10)([1, 2, 3])).toBe(16);
  });

  test("join concatenates with the separator", () => {
    expect(join(", ")(["a", "b"])).toBe("a, b");
  });

  test("split divides a string by the separator", () => {
    expect(split("-")("x-y-z")).toEqual(["x", "y", "z"]);
  });

  test("exclude filters out values in the exclusion list", () => {
    expect(exclude(["blocked", "forbidden"])(["allowed", "blocked"])).toEqual([
      "allowed",
    ]);
  });
});

describe("sort helpers", () => {
  test("sort returns a sorted copy without mutating the input", () => {
    const input = [3, 1, 2];
    const sorted = sort((a, b) => a - b)(input);

    expect(sorted).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("unique", () => {
  test("removes duplicates preserving first-seen order", () => {
    expect(unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });
});
