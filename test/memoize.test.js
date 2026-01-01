import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";
import { arraySlugKey } from "#utils/memoize.js";

const testCases = [
  {
    name: "arraySlugKey-basic",
    description: "Creates cache key from array length and slug",
    test: () => {
      const args = [["item1", "item2", "item3"], "test-slug"];

      const result = arraySlugKey(args);

      expectStrictEqual(
        result,
        "3:test-slug",
        "Should combine array length and slug",
      );
    },
  },
  {
    name: "arraySlugKey-empty-array",
    description: "Handles empty array correctly",
    test: () => {
      const args = [[], "some-slug"];

      const result = arraySlugKey(args);

      expectStrictEqual(
        result,
        "0:some-slug",
        "Should use 0 for empty array length",
      );
    },
  },
  {
    name: "arraySlugKey-null-array",
    description: "Handles null array gracefully",
    test: () => {
      const args = [null, "slug"];

      const result = arraySlugKey(args);

      expectStrictEqual(result, "0:slug", "Should use 0 for null array length");
    },
  },
  {
    name: "arraySlugKey-undefined-array",
    description: "Handles undefined array gracefully",
    test: () => {
      const args = [undefined, "slug"];

      const result = arraySlugKey(args);

      expectStrictEqual(
        result,
        "0:slug",
        "Should use 0 for undefined array length",
      );
    },
  },
  {
    name: "arraySlugKey-large-array",
    description: "Handles large arrays correctly",
    test: () => {
      const largeArray = new Array(1000).fill("item");
      const args = [largeArray, "large-slug"];

      const result = arraySlugKey(args);

      expectStrictEqual(
        result,
        "1000:large-slug",
        "Should handle large array length",
      );
    },
  },
  {
    name: "arraySlugKey-empty-slug",
    description: "Handles empty slug",
    test: () => {
      const args = [["item"], ""];

      const result = arraySlugKey(args);

      expectStrictEqual(result, "1:", "Should handle empty slug");
    },
  },
  {
    name: "arraySlugKey-special-characters",
    description: "Preserves special characters in slug",
    test: () => {
      const args = [["item"], "test-slug-with-special-chars!@#"];

      const result = arraySlugKey(args);

      expectStrictEqual(
        result,
        "1:test-slug-with-special-chars!@#",
        "Should preserve special characters in slug",
      );
    },
  },
];

export default createTestRunner("memoize", testCases);
