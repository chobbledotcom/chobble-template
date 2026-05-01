/**
 * Tests for js-toolkit memoize utilities
 */
import { describe, expect, test } from "bun:test";
import {
  dedupeAsync,
  lruMemoize,
  memoize,
  memoizeByRef,
} from "#toolkit/fp/memoize.js";

/** Create a counter for tracking function calls in tests */
const createCounter = () => ({ count: 0 });

describe("memoize", () => {
  test("throws error when cache exceeds maxCacheSize", () => {
    const memoized = memoize((x) => x * 2, { maxCacheSize: 3 });

    // Fill the cache to its limit
    memoized(1);
    memoized(2);
    memoized(3);

    // Next unique call should throw
    expect(() => memoized(4)).toThrow("Memoize cache exceeded 3 entries");
  });
});

describe("lruMemoize", () => {
  test("caches results until cache is full", () => {
    const counter = createCounter();
    const memoized = lruMemoize(
      (x) => {
        counter.count++;
        return x * 2;
      },
      { maxCacheSize: 3 },
    );

    expect(memoized(1)).toBe(2);
    expect(memoized(1)).toBe(2);
    expect(memoized(2)).toBe(4);
    expect(memoized(2)).toBe(4);
    expect(counter.count).toBe(2);
  });

  test("evicts least-recently-used entry when full", () => {
    const counter = createCounter();
    const memoized = lruMemoize(
      (x) => {
        counter.count++;
        return x * 2;
      },
      { maxCacheSize: 2 },
    );

    memoized(1);
    memoized(2);
    expect(counter.count).toBe(2);

    // Touch 1 so 2 is now least-recently-used
    memoized(1);
    expect(counter.count).toBe(2);

    // Inserting 3 should evict 2 (LRU), keeping 1 and 3
    memoized(3);
    expect(counter.count).toBe(3);

    // 1 still cached, no recompute
    memoized(1);
    expect(counter.count).toBe(3);

    // 2 was evicted, recomputes
    memoized(2);
    expect(counter.count).toBe(4);
  });

  test("respects custom cacheKey", () => {
    const counter = createCounter();
    const memoized = lruMemoize(
      (obj) => {
        counter.count++;
        return obj.value;
      },
      { cacheKey: (args) => args[0].id, maxCacheSize: 5 },
    );

    expect(memoized({ id: "a", value: 1 })).toBe(1);
    // Same id, cached — counter does not increment, original cached value returned
    expect(memoized({ id: "a", value: 999 })).toBe(1);
    expect(counter.count).toBe(1);
  });
});

describe("memoizeByRef", () => {
  test("caches result by object reference", () => {
    const counter = createCounter();
    const expensive = memoizeByRef((obj) => {
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
    const expensive = memoizeByRef((obj) => {
      counter.count++;
      return obj.id;
    });

    const obj1 = { id: "first" };
    const obj2 = { id: "second" };

    const assertBothCached = (expectedCount) => {
      expect(expensive(obj1)).toBe("first");
      expect(expensive(obj2)).toBe("second");
      expect(counter.count).toBe(expectedCount);
    };

    assertBothCached(2);
    // Subsequent calls still use cache
    assertBothCached(2);
  });

  test("works with complex return values", () => {
    const counter = createCounter();
    const buildData = memoizeByRef((api) => {
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

describe("dedupeAsync", () => {
  test("concurrent calls for same key share one Promise", async () => {
    const counter = createCounter();
    const slow = dedupeAsync(async (id) => {
      counter.count++;
      await new Promise((r) => setTimeout(r, 10));
      return `result-${id}`;
    });

    const [r1, r2, r3] = await Promise.all([slow(1), slow(1), slow(1)]);

    expect(r1).toBe("result-1");
    expect(r2).toBe("result-1");
    expect(r3).toBe("result-1");
    expect(counter.count).toBe(1);
  });

  const makeSlowCounter = () => {
    const counter = createCounter();
    const slow = dedupeAsync(async (id) => {
      counter.count++;
      return `result-${id}`;
    });
    return { counter, slow };
  };

  test("different keys run separate operations", async () => {
    const { counter, slow } = makeSlowCounter();

    const [r1, r2] = await Promise.all([slow(1), slow(2)]);

    expect(r1).toBe("result-1");
    expect(r2).toBe("result-2");
    expect(counter.count).toBe(2);
  });

  test("cache clears after Promise resolves", async () => {
    const { counter, slow } = makeSlowCounter();

    await slow(1);
    await slow(1);

    expect(counter.count).toBe(2);
  });

  test("cache clears after Promise rejects", async () => {
    const counter = createCounter();
    const failing = dedupeAsync(async () => {
      counter.count++;
      throw new Error("fail");
    });

    await expect(failing(1)).rejects.toThrow("fail");
    await expect(failing(1)).rejects.toThrow("fail");

    expect(counter.count).toBe(2);
  });

  test("custom cacheKey function", async () => {
    const counter = createCounter();
    const slow = dedupeAsync(
      async (a, b) => {
        counter.count++;
        return a + b;
      },
      { cacheKey: (args) => `${args[0]}:${args[1]}` },
    );

    const [r1, r2] = await Promise.all([slow(1, 2), slow(1, 2)]);

    expect(r1).toBe(3);
    expect(r2).toBe(3);
    expect(counter.count).toBe(1);
  });
});
