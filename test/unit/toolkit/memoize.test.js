/**
 * Tests for js-toolkit memoize utilities
 */
import { describe, expect, test } from "bun:test";
import { withWeakMapCache } from "#toolkit/fp/memoize.js";

/** Create a counter for tracking function calls in tests */
const createCounter = () => ({ count: 0 });

describe("withWeakMapCache", () => {
  test("caches result by object reference", () => {
    const counter = createCounter();
    const expensive = withWeakMapCache((obj) => {
      counter.count++;
      return obj.value * 2;
    });

    const input = { value: 21 };

    const result1 = expensive(input);
    const result2 = expensive(input);
    const result3 = expensive(input);

    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(result3).toBe(42);
    expect(counter.count).toBe(1);
  });

  test("computes separately for different objects", () => {
    const counter = createCounter();
    const expensive = withWeakMapCache((obj) => {
      counter.count++;
      return obj.id;
    });

    const obj1 = { id: "first" };
    const obj2 = { id: "second" };

    expect(expensive(obj1)).toBe("first");
    expect(expensive(obj2)).toBe("second");
    expect(counter.count).toBe(2);

    // Subsequent calls still use cache
    expect(expensive(obj1)).toBe("first");
    expect(expensive(obj2)).toBe("second");
    expect(counter.count).toBe(2);
  });

  test("works with complex return values", () => {
    const counter = createCounter();
    const buildData = withWeakMapCache((api) => {
      counter.count++;
      return {
        pages: api.items.map((i) => ({ id: i })),
        attributes: { count: api.items.length },
      };
    });

    const api = { items: [1, 2, 3] };

    const result1 = buildData(api);
    const result2 = buildData(api);

    expect(result1.pages).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(result1.attributes.count).toBe(3);
    expect(result1).toBe(result2); // Same object reference
    expect(counter.count).toBe(1);
  });
});
