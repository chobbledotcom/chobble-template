import { describe, expect, test } from "bun:test";
import {
  arraySlugKey,
  groupByWithCache,
  indexBy,
  jsonKey,
} from "#utils/memoize.js";

describe("memoize", () => {
  test("Creates cache key from array length and slug", () => {
    const args = [["item1", "item2", "item3"], "test-slug"];

    const result = arraySlugKey(args);

    expect(result).toBe("3:test-slug");
  });

  test("Handles empty array correctly", () => {
    const args = [[], "some-slug"];

    const result = arraySlugKey(args);

    expect(result).toBe("0:some-slug");
  });

  test("Handles null array gracefully", () => {
    const args = [null, "slug"];

    const result = arraySlugKey(args);

    expect(result).toBe("0:slug");
  });

  test("Handles undefined array gracefully", () => {
    const args = [undefined, "slug"];

    const result = arraySlugKey(args);

    expect(result).toBe("0:slug");
  });

  test("Handles large arrays correctly", () => {
    const largeArray = new Array(1000).fill("item");
    const args = [largeArray, "large-slug"];

    const result = arraySlugKey(args);

    expect(result).toBe("1000:large-slug");
  });

  test("Handles empty slug", () => {
    const args = [["item"], ""];

    const result = arraySlugKey(args);

    expect(result).toBe("1:");
  });

  test("Preserves special characters in slug", () => {
    const args = [["item"], "test-slug-with-special-chars!@#"];

    const result = arraySlugKey(args);

    expect(result).toBe("1:test-slug-with-special-chars!@#");
  });
});

describe("jsonKey", () => {
  test("Creates cache key from object by stringifying", () => {
    const args = [{ name: "test", value: 42 }];

    const result = jsonKey(args);

    expect(result).toBe('{"name":"test","value":42}');
  });

  test("Produces same key for equivalent objects", () => {
    const args1 = [{ a: 1, b: 2 }];
    const args2 = [{ a: 1, b: 2 }];

    expect(jsonKey(args1)).toBe(jsonKey(args2));
  });

  test("Produces same key regardless of property order", () => {
    const args1 = [{ a: 1, b: 2, c: 3 }];
    const args2 = [{ c: 3, a: 1, b: 2 }];
    const args3 = [{ b: 2, c: 3, a: 1 }];

    const key1 = jsonKey(args1);
    const key2 = jsonKey(args2);
    const key3 = jsonKey(args3);

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  test("Produces different keys for different objects", () => {
    const args1 = [{ a: 1 }];
    const args2 = [{ a: 2 }];

    expect(jsonKey(args1)).not.toBe(jsonKey(args2));
  });

  test("Handles null values in object", () => {
    const args = [{ name: null, value: "test" }];

    const result = jsonKey(args);

    expect(result).toBe('{"name":null,"value":"test"}');
  });

  test("Handles nested objects", () => {
    const args = [{ outer: { inner: "value" } }];

    const result = jsonKey(args);

    expect(result).toBe('{"outer":{"inner":"value"}}');
  });

  test("Produces same key for nested objects regardless of order", () => {
    const args1 = [{ z: { b: 2, a: 1 }, y: "test" }];
    const args2 = [{ y: "test", z: { a: 1, b: 2 } }];

    expect(jsonKey(args1)).toBe(jsonKey(args2));
  });

  test("Handles arrays in object", () => {
    const args = [{ items: [1, 2, 3] }];

    const result = jsonKey(args);

    expect(result).toBe('{"items":[1,2,3]}');
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
