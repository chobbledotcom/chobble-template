import { describe, expect, test } from "bun:test";
import { findFirst, findFromChildren } from "#utils/thumbnail-finder.js";

// ============================================
// Test Data Factories
// ============================================

/**
 * Create a mock item with data.order and optional thumbnail
 */
const mockItem = (order, thumbnail = undefined) => ({
  data: { order, thumbnail },
  fileSlug: `item-${order}`,
});

/**
 * Create a list of items with specified order and thumbnail
 */
const mockItems = (...specs) =>
  specs.map(([order, thumbnail]) => mockItem(order, thumbnail));

// ============================================
// findFirst Tests
// ============================================

describe("thumbnail-finder", () => {
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

    test("evaluates lazily - skips later sources after finding value", () => {
      const evaluated = { value: false };
      findFirst(
        () => "found",
        () => {
          evaluated.value = true;
          return "never";
        },
      );

      expect(evaluated.value).toBe(false);
    });

    test("handles falsy but non-null values (0, empty string)", () => {
      expect(
        findFirst(
          () => 0,
          () => "fallback",
        ),
      ).toBe(0);
      expect(
        findFirst(
          () => "",
          () => "fallback",
        ),
      ).toBe("");
    });
  });

  // ============================================
  // findFromChildren Tests
  // ============================================

  describe("findFromChildren", () => {
    test("finds thumbnail from first child in sort order", () => {
      const children = mockItems([3, "thumb-3"], [1, "thumb-1"], [2]);

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBe("thumb-1"); // Order 1 comes first
    });

    test("skips children without thumbnails", () => {
      const children = mockItems([1], [2, "thumb-2"], [3]);

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBe("thumb-2");
    });

    test("returns undefined when no children have thumbnails", () => {
      const children = mockItems([1], [2], [3]);

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBeUndefined();
    });

    test("returns undefined for null/empty children", () => {
      expect(findFromChildren(null, (c) => c.data.thumbnail)).toBeUndefined();
      expect(findFromChildren([], (c) => c.data.thumbnail)).toBeUndefined();
      expect(
        findFromChildren(undefined, (c) => c.data.thumbnail),
      ).toBeUndefined();
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

    test("items with order 0 sort before items with higher order", () => {
      const children = [
        { data: { order: 5, thumbnail: "thumb-5" } },
        { data: { order: 0, thumbnail: "thumb-0" } },
        { data: { order: 2, thumbnail: "thumb-2" } },
      ];

      const result = findFromChildren(children, (c) => c.data.thumbnail);

      expect(result).toBe("thumb-0"); // Order 0 comes first
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe("integration patterns", () => {
    test("own thumbnail first, then children fallback", () => {
      const children = mockItems([1, "child-thumb"]);
      const getThumbnail = () => "own-thumb";

      const result = findFirst(getThumbnail, () =>
        findFromChildren(children, (c) => c.data.thumbnail),
      );

      expect(result).toBe("own-thumb");
    });

    test("falls back to children when no own thumbnail", () => {
      const children = mockItems([1, "child-thumb"]);

      const result = findFirst(
        () => undefined,
        () => findFromChildren(children, (c) => c.data.thumbnail),
      );

      expect(result).toBe("child-thumb");
    });

    test("recursive pattern via nested findFirst calls", () => {
      // Simulate: parent -> child -> grandchild
      const grandchild = mockItem(1, "grandchild-thumb");
      const child = { data: { order: 1 }, children: [grandchild] };
      const parent = { data: { order: 1 }, children: [child] };

      // Build a recursive resolver using findFirst composition
      const resolveThumbnail = (item) =>
        findFirst(
          () => item.data?.thumbnail,
          () => findFromChildren(item.children, resolveThumbnail),
        );

      expect(resolveThumbnail(parent)).toBe("grandchild-thumb");
    });

    test("prefers earlier children in sort order", () => {
      const child1 = mockItem(2, "child-2-thumb");
      const child2 = mockItem(1, "child-1-thumb");
      const parent = { data: { order: 1 }, children: [child1, child2] };

      const result = findFirst(
        () => parent.data.thumbnail,
        () => findFromChildren(parent.children, (c) => c.data.thumbnail),
      );

      expect(result).toBe("child-1-thumb");
    });

    test("lookup table pattern with child fallback", () => {
      const lookup = { "cat-a": "thumb-a", "cat-b": "thumb-b" };
      const children = [mockItem(2), mockItem(1)];
      children[0].fileSlug = "cat-x";
      children[1].fileSlug = "cat-b";

      // Lookup direct, then fall back to children
      const result = findFirst(
        () => lookup["cat-missing"],
        () => findFromChildren(children, (c) => lookup[c.fileSlug]),
      );

      expect(result).toBe("thumb-b");
    });
  });
});
