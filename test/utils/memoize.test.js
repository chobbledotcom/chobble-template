import { describe, test, expect } from "bun:test";
import { arraySlugKey } from "#utils/memoize.js";

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
