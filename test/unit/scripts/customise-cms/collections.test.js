import { describe, expect, test } from "bun:test";
import {
  COLLECTIONS,
  getCollection,
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";

describe("getCollection", () => {
  test("returns collection by name", () => {
    const products = getCollection("products");
    expect(products.name).toBe("products");
    expect(products.label).toBe("Products");
  });

  test("returns undefined for unknown collection", () => {
    expect(getCollection("unknown-collection")).toBeUndefined();
  });

  test("strips src/ prefix when hasSrcFolder is false", () => {
    const pages = getCollection("pages", false);
    expect(pages.path).toBe("pages");
  });

  test("preserves src/ prefix when hasSrcFolder is true", () => {
    const pages = getCollection("pages", true);
    expect(pages.path).toBe("src/pages");
  });

  test("returns unmodified path when hasSrcFolder is null", () => {
    const pages = getCollection("pages", null);
    expect(pages.path).toBe("src/pages");
  });
});

describe("getSelectableCollections", () => {
  test("excludes required and internal collections", () => {
    const selectable = getSelectableCollections();

    expect(selectable.some((c) => c.required)).toBe(false);
    expect(selectable.some((c) => c.internal)).toBe(false);
  });

  test("includes user-facing collections", () => {
    const names = getSelectableCollections().map((c) => c.name);

    expect(names).toContain("products");
    expect(names).toContain("news");
    expect(names).toContain("events");
  });

  test("does not include pages or snippets", () => {
    const names = getSelectableCollections().map((c) => c.name);

    expect(names).not.toContain("pages");
    expect(names).not.toContain("snippets");
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
  test("returns selected collections unchanged when no dependencies", () => {
    const resolved = resolveDependencies(["pages", "news"]);

    expect(resolved).toContain("pages");
    expect(resolved).toContain("news");
    expect(resolved).toHaveLength(2);
  });

  test("adds categories when products is selected", () => {
    const resolved = resolveDependencies(["products"]);

    expect(resolved).toContain("products");
    expect(resolved).toContain("categories");
  });

  test("resolves nested dependencies for menu-items", () => {
    const resolved = resolveDependencies(["menu-items"]);

    expect(resolved).toContain("menu-items");
    expect(resolved).toContain("menu-categories");
    expect(resolved).toContain("menus");
  });

  test("deduplicates when dependencies overlap with selections", () => {
    const resolved = resolveDependencies(["products", "categories"]);

    expect(resolved).toContain("products");
    expect(resolved).toContain("categories");
    expect(resolved).toHaveLength(2);
  });

  test("deduplicates repeated inputs", () => {
    const resolved = resolveDependencies(["products", "products"]);
    const productCount = resolved.filter((c) => c === "products").length;

    expect(productCount).toBe(1);
  });

  test("is idempotent", () => {
    const first = resolveDependencies(["products", "menu-items"]);
    const second = resolveDependencies(first);

    expect(second.sort()).toEqual(first.sort());
  });

  test("does not add spurious dependencies for independent collections", () => {
    const selected = ["news", "reviews", "properties"];
    const resolved = resolveDependencies(selected);

    expect(resolved.sort()).toEqual(selected.sort());
  });
});

describe("COLLECTIONS data integrity", () => {
  test("every collection with dependencies references existing collections", () => {
    const names = COLLECTIONS.map((c) => c.name);

    for (const collection of COLLECTIONS) {
      for (const dep of collection.dependencies ?? []) {
        expect(names).toContain(dep);
      }
    }
  });
});
