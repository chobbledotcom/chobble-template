import { describe, expect, test } from "bun:test";
import { arraySlugKey, jsonKey } from "#utils/memoize.js";

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
