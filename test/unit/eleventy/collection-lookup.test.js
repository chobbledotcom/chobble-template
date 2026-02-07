import { describe, expect, test } from "bun:test";
import {
  configureCollectionLookup,
  getBySlug,
  indexBySlug,
} from "#eleventy/collection-lookup.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

/** Create a single collection item with slug, title, and url */
const slugItem = (slug, title, url) => ({
  fileSlug: slug,
  url,
  data: { title },
});

/** Create collection items from [slug, title, url] tuples */
const slugItems = (tuples) =>
  tuples.map(([slug, title, url]) => slugItem(slug, title, url));

describe("collection-lookup", () => {
  describe("configureCollectionLookup", () => {
    test("Registers getBySlug filter with Eleventy", () => {
      const mockConfig = createMockEleventyConfig();
      configureCollectionLookup(mockConfig);

      expect(typeof mockConfig.filters.getBySlug).toBe("function");
    });
  });

  describe("getBySlug", () => {
    test("Returns item matching the slug", () => {
      const collection = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
        ["gadget", "Gadget Plus", "/products/gadget/"],
      ]);

      const result = getBySlug(collection, "widget");

      expect(result.fileSlug).toBe("widget");
      expect(result.data.title).toBe("Widget Pro");
      expect(result.url).toBe("/products/widget/");
    });

    test("Normalises path-style slugs before lookup", () => {
      const collection = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
      ]);

      expect(getBySlug(collection, "products/widget.md").data.title).toBe(
        "Widget Pro",
      );
      expect(getBySlug(collection, "products/widget").data.title).toBe(
        "Widget Pro",
      );
      expect(getBySlug(collection, "widget").data.title).toBe("Widget Pro");
    });

    test("Throws for non-existent slug", () => {
      const collection = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
      ]);

      expect(() => getBySlug(collection, "missing")).toThrow(
        'Slug "missing" not found',
      );
    });

    test("Throws for empty collection", () => {
      expect(() => getBySlug([], "widget")).toThrow('Slug "widget" not found');
    });

    test("Handles collection with single item", () => {
      const collection = slugItems([
        ["only-item", "Only Item", "/products/only-item/"],
      ]);

      const result = getBySlug(collection, "only-item");

      expect(result.data.title).toBe("Only Item");
    });
  });

  describe("indexBySlug", () => {
    test("Creates slug lookup object from collection", () => {
      const collection = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
        ["gadget", "Gadget Plus", "/products/gadget/"],
      ]);

      const index = indexBySlug(collection);

      expect(index.widget.data.title).toBe("Widget Pro");
      expect(index.gadget.data.title).toBe("Gadget Plus");
    });

    test("Returns same cached object for same collection reference", () => {
      const collection = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
      ]);

      const first = indexBySlug(collection);
      const second = indexBySlug(collection);

      expect(first).toBe(second);
    });

    test("Returns different objects for different collection references", () => {
      const collection1 = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
      ]);
      const collection2 = slugItems([
        ["widget", "Widget Pro", "/products/widget/"],
      ]);

      const result1 = indexBySlug(collection1);
      const result2 = indexBySlug(collection2);

      expect(result1).not.toBe(result2);
    });

    test("Handles empty collection", () => {
      const index = indexBySlug([]);

      expect(Object.keys(index)).toHaveLength(0);
    });

    test("Last item wins for duplicate slugs", () => {
      const collection = [
        slugItem("widget", "First Widget", "/first/"),
        slugItem("widget", "Second Widget", "/second/"),
      ];

      const index = indexBySlug(collection);

      expect(index.widget.data.title).toBe("Second Widget");
    });
  });

  describe("O(1) lookup performance", () => {
    test("Multiple lookups use cached index", () => {
      const collection = slugItems([
        ["a", "Item A", "/a/"],
        ["b", "Item B", "/b/"],
        ["c", "Item C", "/c/"],
      ]);

      const result1 = getBySlug(collection, "a");
      const result2 = getBySlug(collection, "b");
      const result3 = getBySlug(collection, "c");

      expect(result1.data.title).toBe("Item A");
      expect(result2.data.title).toBe("Item B");
      expect(result3.data.title).toBe("Item C");
    });
  });
});
