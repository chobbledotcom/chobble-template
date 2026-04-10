import { describe, expect, test } from "bun:test";
import {
  COLLECTIONS,
  getCollection,
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";

describe("customise-cms collections", () => {
  describe("getCollection", () => {
    test("returns collection by name", () => {
      const products = getCollection("products");
      expect(products.name).toBe("products");
      expect(products.label).toBe("Products");
    });

    test("returns undefined for unknown collection", () => {
      expect(getCollection("unknown-collection")).toBeUndefined();
    });

    test("strips src/ prefix from path when hasSrcFolder is false", () => {
      const products = getCollection("products", false);
      expect(products.path).toBe("products");
    });

    test("preserves src/ prefix when hasSrcFolder is true", () => {
      const products = getCollection("products", true);
      expect(products.path).toBe("src/products");
    });

    test("returns unmodified path when hasSrcFolder is null", () => {
      const products = getCollection("products", null);
      expect(products.path).toBe("src/products");
    });
  });

  describe("getSelectableCollections", () => {
    test("excludes internal and required collections", () => {
      const selectable = getSelectableCollections();
      expect(selectable.some((c) => c.required)).toBe(false);
      expect(selectable.some((c) => c.internal)).toBe(false);
    });

    test("includes user-selectable collections", () => {
      const names = getSelectableCollections().map((c) => c.name);
      expect(names).toContain("products");
      expect(names).toContain("news");
      expect(names).toContain("events");
    });
  });

  describe("getRequiredCollections", () => {
    test("returns only collections marked as required", () => {
      const required = getRequiredCollections();
      expect(required.length).toBeGreaterThan(0);
      expect(required.every((c) => c.required)).toBe(true);
    });

    test("includes pages and snippets", () => {
      const names = getRequiredCollections().map((c) => c.name);
      expect(names).toContain("pages");
      expect(names).toContain("snippets");
    });
  });

  describe("resolveDependencies", () => {
    test("returns selected collections without dependencies unchanged", () => {
      const resolved = resolveDependencies(["pages", "news"]);
      expect(resolved).toContain("pages");
      expect(resolved).toContain("news");
      expect(resolved.length).toBe(2);
    });

    test("adds required dependencies for products", () => {
      const resolved = resolveDependencies(["products"]);
      expect(resolved).toContain("products");
      expect(resolved).toContain("categories");
    });

    test("resolves nested dependencies transitively", () => {
      const resolved = resolveDependencies(["menu-items"]);
      expect(resolved).toContain("menu-items");
      expect(resolved).toContain("menu-categories");
      expect(resolved).toContain("menus");
    });

    test("deduplicates when same collection appears multiple times", () => {
      const resolved = resolveDependencies([
        "products",
        "categories",
        "products",
      ]);
      const productCount = resolved.filter((c) => c === "products").length;
      expect(productCount).toBe(1);
    });

    test("does not add spurious dependencies for independent collections", () => {
      const selected = ["news", "reviews", "locations", "properties"];
      const resolved = resolveDependencies(selected);
      expect(resolved.sort()).toEqual(selected.sort());
    });

    test("handles already-resolved dependencies without infinite loop", () => {
      const resolved = resolveDependencies(["products", "categories"]);
      expect(resolved).toContain("products");
      expect(resolved).toContain("categories");
      expect(resolved.length).toBe(2);
    });
  });

  describe("COLLECTIONS data integrity", () => {
    test("snippets is both internal and required", () => {
      const snippets = COLLECTIONS.find((c) => c.name === "snippets");
      expect(snippets.internal).toBe(true);
      expect(snippets.required).toBe(true);
    });

    test("all collection names are unique", () => {
      const names = COLLECTIONS.map((c) => c.name);
      expect(names.length).toBe(new Set(names).size);
    });
  });
});
