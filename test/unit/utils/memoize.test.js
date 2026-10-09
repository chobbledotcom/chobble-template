import { describe, expect, test } from "vitest";
import {
  dedupeAsync,
  groupByWithCache,
  indexBy,
  jsonKey,
  memoize,
} from "#utils/fp/memoize.js";

/** Create a counter for tracking function calls in tests */
const createCounter = () => ({ count: 0 });

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

describe("jsonKey", () => {
  test("stringifies the first argument", () => {
    expect(jsonKey([{ a: 1 }])).toBe('{"a":1}');
  });

  test("lets memoize treat equal-content objects as one key", () => {
    const counter = createCounter();
    const compute = memoize(
      (obj) => {
        counter.count++;
        return obj.a;
      },
      { cacheKey: jsonKey },
    );

    expect(compute({ a: 1 })).toBe(1);
    expect(compute({ a: 1 })).toBe(1);
    expect(counter.count).toBe(1);
  });
});

describe("memoize", () => {
  test("caches by default key: a repeated call returns the same result object", () => {
    // The fn builds a fresh object each run, so an identical reference on the
    // second call proves the result was cached, not recomputed.
    const build = memoize((n) => ({ doubled: n * 2 }));
    const first = build(5);
    const second = build(5);
    expect(second).toBe(first);
    expect(first.doubled).toBe(10);
  });

  test("honours a custom cacheKey when deciding hits", () => {
    // Key on the second arg, so a different first arg is still a hit — the
    // default key (first arg) would miss and recompute a different sum.
    const build = memoize((a, b) => ({ sum: a + b }), {
      cacheKey: (args) => args[1],
    });
    build(2, 3);
    expect(build(40, 3).sum).toBe(5); // cached 2+3, not a recomputed 43
  });
});

describe("indexBy", () => {
  test("Creates lookup object from array using key function", () => {
    const items = [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ];
    const indexById = indexBy((item) => item.id);

    const result = indexById(items);

    expect(result.a).toEqual({ id: "a", name: "Alpha" });
    expect(result.b).toEqual({ id: "b", name: "Beta" });
  });

  test("Returns cached object for same array reference", () => {
    const items = [
      { slug: "one", value: 1 },
      { slug: "two", value: 2 },
    ];
    const indexBySlug = indexBy((item) => item.slug);

    const first = indexBySlug(items);
    const second = indexBySlug(items);

    expect(first).toBe(second); // Same reference = cache hit
  });

  test("Creates separate objects for different arrays", () => {
    const items1 = [{ slug: "a", value: 1 }];
    const items2 = [{ slug: "a", value: 2 }];
    const indexBySlug = indexBy((item) => item.slug);

    const result1 = indexBySlug(items1);
    const result2 = indexBySlug(items2);

    expect(result1).not.toBe(result2);
    expect(result1.a.value).toBe(1);
    expect(result2.a.value).toBe(2);
  });

  test("Separate indexers have independent caches", () => {
    const items = [{ slug: "x", url: "/page/" }];
    const indexBySlug = indexBy((item) => item.slug);
    const indexByUrl = indexBy((item) => item.url);

    const bySlug = indexBySlug(items);
    const byUrl = indexByUrl(items);

    expect(bySlug.x).toBeDefined();
    expect(byUrl.x).toBeUndefined();
  });

  test("Returns undefined for missing keys", () => {
    const items = [{ id: "exists" }];
    const indexById = indexBy((item) => item.id);

    const result = indexById(items);

    expect(result.exists).toBeDefined();
    expect(result.missing).toBeUndefined();
  });
});

describe("groupByWithCache", () => {
  test("Groups items by multiple keys", () => {
    const items = [
      { name: "Widget A", categories: ["cat1", "cat2"] },
      { name: "Widget B", categories: ["cat2", "cat3"] },
      { name: "Widget C", categories: ["cat1"] },
    ];
    const groupByCategories = groupByWithCache((item) => item.categories);

    const result = groupByCategories(items);

    expect(result.cat1).toHaveLength(2);
    expect(result.cat1.map((i) => i.name)).toEqual(["Widget A", "Widget C"]);
    expect(result.cat2).toHaveLength(2);
    expect(result.cat3).toHaveLength(1);
  });

  test("Returns cached object for same array reference", () => {
    const items = [{ name: "A", tags: ["x", "y"] }];
    const groupByTags = groupByWithCache((item) => item.tags);

    const first = groupByTags(items);
    const second = groupByTags(items);

    expect(first).toBe(second); // Same reference = cache hit
  });

  test("Creates separate objects for different arrays", () => {
    const items1 = [{ name: "A", tags: ["x"] }];
    const items2 = [{ name: "B", tags: ["x"] }];
    const groupByTags = groupByWithCache((item) => item.tags);

    const result1 = groupByTags(items1);
    const result2 = groupByTags(items2);

    expect(result1).not.toBe(result2);
    expect(result1.x[0].name).toBe("A");
    expect(result2.x[0].name).toBe("B");
  });

  test("Returns undefined for missing keys", () => {
    const items = [{ tags: ["exists"] }];
    const groupByTags = groupByWithCache((item) => item.tags);

    const result = groupByTags(items);

    expect(result.exists).toHaveLength(1);
    expect(result.missing).toBeUndefined();
  });

  test("Handles items with empty key arrays", () => {
    const items = [
      { title: "First", tags: ["active"] },
      { title: "Second", tags: [] },
      { title: "Third", tags: ["active"] },
    ];
    const groupByTags = groupByWithCache((item) => item.tags);

    const result = groupByTags(items);

    expect(result.active).toHaveLength(2);
    expect(Object.keys(result)).toEqual(["active"]);
  });

  test("Separate groupers have independent caches", () => {
    const items = [{ categories: ["a"], events: ["b"] }];
    const groupByCategories = groupByWithCache((item) => item.categories);
    const groupByEvents = groupByWithCache((item) => item.events);

    const byCat = groupByCategories(items);
    const byEvent = groupByEvents(items);

    expect(byCat.a).toBeDefined();
    expect(byCat.b).toBeUndefined();
    expect(byEvent.b).toBeDefined();
    expect(byEvent.a).toBeUndefined();
  });
});
