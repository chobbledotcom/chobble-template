import { describe, expect, test } from "vitest";
import {
  COLLECTIONS,
  getCollection,
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";

describe("getCollection", () => {
  test("returns collection by name", () => {
    const news = getCollection("news");
    expect(news.name).toBe("news");
    expect(news.label).toBe("News");
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

    expect(names).toContain("news");
    expect(names).toContain("guide-categories");
    expect(names).toContain("guide-pages");
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

  test("adds guide-categories when guide-pages is selected", () => {
    const resolved = resolveDependencies(["guide-pages"]);

    expect(resolved).toContain("guide-pages");
    expect(resolved).toContain("guide-categories");
  });

  test("deduplicates when dependencies overlap with selections", () => {
    const resolved = resolveDependencies(["guide-pages", "guide-categories"]);

    expect(resolved).toContain("guide-pages");
    expect(resolved).toContain("guide-categories");
    expect(resolved).toHaveLength(2);
  });

  test("deduplicates repeated inputs", () => {
    const resolved = resolveDependencies(["news", "news"]);
    const newsCount = resolved.filter((c) => c === "news").length;

    expect(newsCount).toBe(1);
  });

  test("is idempotent", () => {
    const first = resolveDependencies(["news", "guide-pages"]);
    const second = resolveDependencies(first);

    expect(second.sort()).toEqual(first.sort());
  });

  test("does not add spurious dependencies for independent collections", () => {
    const selected = ["news"];
    const resolved = resolveDependencies(selected);

    expect(resolved.sort()).toEqual(selected.sort());
  });
});

describe("COLLECTIONS data integrity", () => {
  test("every collection declares dependencies that reference existing collections", () => {
    const names = COLLECTIONS.map((c) => c.name);

    for (const collection of COLLECTIONS) {
      expect(Array.isArray(collection.dependencies)).toBe(true);
      for (const dep of collection.dependencies) {
        expect(names).toContain(dep);
      }
    }
  });
});
