import { describe, expect, test } from "bun:test";
import { groupByWithCache, indexBy, memoize } from "#toolkit/fp/memoize.js";

describe("memoize", () => {
  test("runs the underlying fn once per key and reuses the result", () => {
    let calls = 0;
    const double = memoize((n) => {
      calls += 1;
      return n * 2;
    });
    expect(double(5)).toBe(10);
    expect(double(5)).toBe(10);
    expect(calls).toBe(1); // cached: the second call must not re-run the fn
  });

  test("recomputes for a different key", () => {
    let calls = 0;
    const double = memoize((n) => {
      calls += 1;
      return n * 2;
    });
    double(5);
    double(6);
    expect(calls).toBe(2);
  });

  test("honours a custom cacheKey when deciding hits", () => {
    let calls = 0;
    // Key on the second arg, so a different first arg is still a cache hit —
    // the default key (first arg) would miss and recompute.
    const add = memoize(
      (a, b) => {
        calls += 1;
        return a + b;
      },
      { cacheKey: (args) => args[1] },
    );
    expect(add(2, 3)).toBe(5);
    expect(add(40, 3)).toBe(5); // same cacheKey (3) → cached 5, not 43
    expect(calls).toBe(1);
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
