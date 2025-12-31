import { arraySlugKey, memoize } from "#utils/memoize.js";
import {
  createTestRunner,
  expectStrictEqual,
  expectFunctionType,
} from "./test-utils.js";

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

      expectStrictEqual(
        result,
        "0:slug",
        "Should use 0 for null array length",
      );
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

      expectStrictEqual(
        result,
        "1:",
        "Should handle empty slug",
      );
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
  {
    name: "memoize-exported",
    description: "memoize function is exported and callable",
    test: () => {
      expectFunctionType(memoize, undefined, "memoize should be a function");
    },
  },
  {
    name: "memoize-works",
    description: "memoize function memoizes correctly",
    test: () => {
      let callCount = 0;
      const expensiveFn = (x) => {
        callCount++;
        return x * 2;
      };

      const memoizedFn = memoize(expensiveFn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);
      const result3 = memoizedFn(10);

      expectStrictEqual(result1, 10, "First call should return correct result");
      expectStrictEqual(result2, 10, "Second call should return cached result");
      expectStrictEqual(result3, 20, "Different arg should compute new result");
      expectStrictEqual(callCount, 2, "Function should only be called twice");
    },
  },
  {
    name: "arraySlugKey-with-memoize",
    description: "arraySlugKey works as cache key for memoize",
    test: () => {
      let callCount = 0;
      const filterFn = (arr, slug) => {
        callCount++;
        return arr.filter((item) => item.slug === slug);
      };

      const memoizedFilter = memoize(filterFn, { cacheKey: arraySlugKey });

      const items = [
        { slug: "a", name: "Item A" },
        { slug: "b", name: "Item B" },
      ];

      const result1 = memoizedFilter(items, "a");
      const result2 = memoizedFilter(items, "a");
      const result3 = memoizedFilter(items, "b");

      expectStrictEqual(result1.length, 1, "First call should filter correctly");
      expectStrictEqual(
        result1[0].name,
        "Item A",
        "First call should return correct item",
      );
      expectStrictEqual(
        result2.length,
        1,
        "Second call should return cached result",
      );
      expectStrictEqual(
        result3.length,
        1,
        "Different slug should compute new result",
      );
      expectStrictEqual(
        callCount,
        2,
        "Function should only be called twice with different slugs",
      );
    },
  },
];

export default createTestRunner("memoize", testCases);
