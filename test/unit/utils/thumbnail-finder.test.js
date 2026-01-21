import { describe, expect, test } from "bun:test";
import {
  createThumbnailResolver,
  findFirst,
  findFromChildren,
  findWithLookupFallback,
  first,
  yieldFromChildren,
  yieldFromSources,
  yieldSorted,
  yieldThumbnailsRecursive,
} from "#utils/thumbnail-finder.js";

// ============================================
// Test Data Factories
// ============================================

/**
 * Create a mock item with data.order and optional thumbnail
 */
const mockItem = (order, thumbnail = undefined, children = undefined) => ({
  data: { order, thumbnail },
  fileSlug: `item-${order}`,
  ...(children && { children }),
});

/**
 * Create a list of items with sequential orders
 */
const mockItems = (...specs) =>
  specs.map(([order, thumbnail]) => mockItem(order, thumbnail));

/**
 * Helper to collect results from yieldThumbnailsRecursive with default extractors
 */
const collectRecursive = (item) => [
  ...yieldThumbnailsRecursive(
    item,
    (i) => i.data.thumbnail,
    (i) => i.children,
  ),
];

/**
 * Create a default thumbnail resolver for testing
 */
const defaultResolver = (recursive = false) =>
  createThumbnailResolver({
    getThumbnail: (i) => i.data.thumbnail,
    getChildren: (i) => i.children,
    recursive,
  });

/**
 * Create a three-level hierarchy: grandchild -> child -> parent
 */
const createHierarchy = (grandchildThumb) => {
  const grandchild = mockItem(1, grandchildThumb);
  const child = { data: { order: 1 }, children: [grandchild] };
  const parent = { data: { order: 1 }, children: [child] };
  return parent;
};

// ============================================
// Generator Utilities
// ============================================

describe("thumbnail-finder", () => {
  describe("yieldSorted", () => {
    test("yields items in order by data.order", () => {
      const items = mockItems([3], [1], [2]);

      const result = [...yieldSorted(items)];

      expect(result.map((i) => i.data.order)).toEqual([1, 2, 3]);
    });

    test("yields nothing for empty array", () => {
      const result = [...yieldSorted([])];

      expect(result).toEqual([]);
    });

    test("yields nothing for null/undefined", () => {
      expect([...yieldSorted(null)]).toEqual([]);
      expect([...yieldSorted(undefined)]).toEqual([]);
    });

    test("uses custom order function", () => {
      const items = [{ priority: 10 }, { priority: 5 }, { priority: 15 }];

      const result = [...yieldSorted(items, (i) => i.priority)];

      expect(result.map((i) => i.priority)).toEqual([5, 10, 15]);
    });

    test("handles items without order (defaults to 0)", () => {
      const items = [
        { data: { order: 5 } },
        { data: {} },
        { data: { order: 2 } },
      ];

      const result = [...yieldSorted(items)];

      expect(result.map((i) => i.data.order ?? 0)).toEqual([0, 2, 5]);
    });
  });

  describe("yieldFromSources", () => {
    test("yields first non-null value", () => {
      const sources = [
        () => null,
        () => undefined,
        () => "found",
        () => "ignored",
      ];

      const result = [...yieldFromSources(sources)];

      expect(result).toEqual(["found"]);
    });

    test("yields nothing when all sources return null/undefined", () => {
      const sources = [() => null, () => undefined];

      const result = [...yieldFromSources(sources)];

      expect(result).toEqual([]);
    });

    test("short-circuits after finding value (lazy evaluation)", () => {
      let callCount = 0;
      const sources = [
        () => {
          callCount++;
          return null;
        },
        () => {
          callCount++;
          return "found";
        },
        () => {
          callCount++;
          return "never called";
        },
      ];

      const gen = yieldFromSources(sources);
      gen.next(); // Get first value

      expect(callCount).toBe(2); // Only first two sources called
    });

    test("yields first value immediately (0 is falsy but not null)", () => {
      // 0 is falsy but not null/undefined, so should not be yielded
      const sources = [() => 0, () => "fallback"];

      const result = [...yieldFromSources(sources)];

      // 0 == null is false, so 0 should be yielded
      expect(result).toEqual([0]);
    });

    test("empty string is not yielded (falsy)", () => {
      const sources = [() => "", () => "fallback"];

      const result = [...yieldFromSources(sources)];

      // "" == null is false, so "" should be yielded
      expect(result).toEqual([""]);
    });
  });

  describe("first", () => {
    test("returns first value from generator", () => {
      function* gen() {
        yield "a";
        yield "b";
      }

      expect(first(gen())).toBe("a");
    });

    test("returns undefined for empty generator", () => {
      function* gen() {}

      expect(first(gen())).toBeUndefined();
    });
  });

  describe("findFirst", () => {
    test("returns first non-null value from sources", () => {
      const result = findFirst(
        () => null,
        () => "found",
        () => "ignored",
      );

      expect(result).toBe("found");
    });

    test("returns undefined when all sources are null", () => {
      const result = findFirst(
        () => null,
        () => undefined,
      );

      expect(result).toBeUndefined();
    });

    test("works with single source", () => {
      expect(findFirst(() => "only")).toBe("only");
      expect(findFirst(() => null)).toBeUndefined();
    });

    test("evaluates lazily", () => {
      let evaluated = false;
      findFirst(
        () => "found",
        () => {
          evaluated = true;
          return "never";
        },
      );

      expect(evaluated).toBe(false);
    });
  });

  // ============================================
  // Child Search Functions
  // ============================================

  describe("yieldFromChildren", () => {
    test("yields thumbnail from first sorted child that has one", () => {
      const children = mockItems([3, "thumb-3"], [1, "thumb-1"], [2]);

      const result = [...yieldFromChildren(children, (c) => c.data.thumbnail)];

      expect(result).toEqual(["thumb-1"]); // Order 1 comes first
    });

    test("skips children without thumbnails", () => {
      const children = mockItems([1], [2, "thumb-2"], [3]);

      const result = [...yieldFromChildren(children, (c) => c.data.thumbnail)];

      expect(result).toEqual(["thumb-2"]);
    });

    test("yields nothing when no children have thumbnails", () => {
      const children = mockItems([1], [2], [3]);

      const result = [...yieldFromChildren(children, (c) => c.data.thumbnail)];

      expect(result).toEqual([]);
    });

    test("yields nothing for empty children", () => {
      expect([...yieldFromChildren([], (c) => c.data.thumbnail)]).toEqual([]);
      expect([...yieldFromChildren(null, (c) => c.data.thumbnail)]).toEqual([]);
    });
  });

  describe("findFromChildren", () => {
    test("finds thumbnail from sorted children", () => {
      const children = mockItems([3, "thumb-3"], [1, "thumb-1"], [2]);

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBe("thumb-1");
    });

    test("returns undefined when no children have thumbnails", () => {
      const children = mockItems([1], [2], [3]);

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBeUndefined();
    });

    test("returns undefined for null/empty children", () => {
      expect(findFromChildren(null, (c) => c.data.thumbnail)).toBeUndefined();
      expect(findFromChildren([], (c) => c.data.thumbnail)).toBeUndefined();
    });

    test("uses custom order function", () => {
      const children = [
        { priority: 10, thumb: "thumb-10" },
        { priority: 5, thumb: "thumb-5" },
      ];

      const result = findFromChildren(
        children,
        (c) => c.thumb,
        (c) => c.priority,
      );

      expect(result).toBe("thumb-5"); // Lower priority comes first
    });
  });

  // ============================================
  // Recursive Generator
  // ============================================

  describe("yieldThumbnailsRecursive", () => {
    test("yields own thumbnail first", () => {
      const item = mockItem(1, "own-thumb");
      expect(collectRecursive(item)).toEqual(["own-thumb"]);
    });

    test("yields from children when no own thumbnail", () => {
      const item = {
        data: { order: 1 },
        children: mockItems([2, "child-thumb"], [1]),
      };
      expect(collectRecursive(item)).toEqual(["child-thumb"]);
    });

    test("recurses into grandchildren", () => {
      expect(collectRecursive(createHierarchy("grandchild-thumb"))).toEqual([
        "grandchild-thumb",
      ]);
    });

    test("prefers earlier children in sort order", () => {
      const child1 = mockItem(2, "child-2-thumb");
      const child2 = mockItem(1, "child-1-thumb");
      const parent = { data: { order: 1 }, children: [child1, child2] };
      expect(collectRecursive(parent)).toEqual(["child-1-thumb"]);
    });

    test("yields nothing when no thumbnails in hierarchy", () => {
      const child = { data: { order: 1 } };
      const parent = { data: { order: 1 }, children: [child] };
      expect(collectRecursive(parent)).toEqual([]);
    });
  });

  // ============================================
  // Thumbnail Resolver Factory
  // ============================================

  describe("createThumbnailResolver", () => {
    test("returns own thumbnail when present", () => {
      expect(defaultResolver()(mockItem(1, "own-thumb"))).toBe("own-thumb");
    });

    test("falls back to children when no own thumbnail", () => {
      const item = {
        data: { order: 1 },
        children: mockItems([2, "child-2"], [1, "child-1"]),
      };
      expect(defaultResolver()(item)).toBe("child-1");
    });

    test("returns undefined when no thumbnails found", () => {
      const item = { data: { order: 1 }, children: mockItems([1], [2]) };
      expect(defaultResolver()(item)).toBeUndefined();
    });

    test("non-recursive does not check grandchildren", () => {
      expect(defaultResolver(false)(createHierarchy("thumb"))).toBeUndefined();
    });

    test("recursive mode checks grandchildren", () => {
      expect(defaultResolver(true)(createHierarchy("thumb"))).toBe("thumb");
    });

    test("uses custom order function", () => {
      const resolve = createThumbnailResolver({
        getThumbnail: (i) => i.thumb,
        getChildren: (i) => i.kids,
        getOrder: (i) => i.priority,
      });

      const item = {
        kids: [
          { priority: 10, thumb: "thumb-10" },
          { priority: 5, thumb: "thumb-5" },
        ],
      };

      expect(resolve(item)).toBe("thumb-5");
    });
  });

  // ============================================
  // Lookup Table Pattern
  // ============================================

  describe("findWithLookupFallback", () => {
    const lookup = {
      "cat-a": "thumb-a",
      "cat-b": "thumb-b",
    };

    test("returns value from lookup when key exists", () => {
      const result = findWithLookupFallback(
        "cat-a",
        lookup,
        [],
        (c) => c.fileSlug,
      );

      expect(result).toBe("thumb-a");
    });

    test("falls back to children when key not in lookup", () => {
      const children = [mockItem(2), mockItem(1)];
      children[0].fileSlug = "cat-x";
      children[1].fileSlug = "cat-b";

      const result = findWithLookupFallback(
        "cat-missing",
        lookup,
        children,
        (c) => c.fileSlug,
      );

      expect(result).toBe("thumb-b"); // Order 1 first, has lookup entry
    });

    test("returns undefined when no match in lookup or children", () => {
      const children = [mockItem(1), mockItem(2)];
      children[0].fileSlug = "cat-x";
      children[1].fileSlug = "cat-y";

      const result = findWithLookupFallback(
        "cat-missing",
        lookup,
        children,
        (c) => c.fileSlug,
      );

      expect(result).toBeUndefined();
    });

    test("returns undefined for null/empty children", () => {
      expect(
        findWithLookupFallback("missing", lookup, null, (c) => c.fileSlug),
      ).toBeUndefined();
      expect(
        findWithLookupFallback("missing", lookup, [], (c) => c.fileSlug),
      ).toBeUndefined();
    });

    test("uses custom order function", () => {
      const children = [
        { priority: 10, fileSlug: "cat-b" },
        { priority: 5, fileSlug: "cat-a" },
      ];

      const result = findWithLookupFallback(
        "missing",
        lookup,
        children,
        (c) => c.fileSlug,
        (c) => c.priority,
      );

      expect(result).toBe("thumb-a"); // Priority 5 first
    });
  });
});
