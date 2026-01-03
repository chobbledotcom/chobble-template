import { describe, test, expect } from "bun:test";
import { configureGuides, guidesByCategory } from "#collections/guides.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("guides", () => {
  test("Filters guide pages by category slug", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
      { data: { title: "Guide 2", "guide-category": "advanced" } },
      { data: { title: "Guide 3", "guide-category": "getting-started" } },
      { data: { title: "Guide 4", "guide-category": "tips" } },
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Guide 1");
    expect(result[1].data.title).toBe("Guide 3");
  });

  test("Returns single guide when only one matches", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
      { data: { title: "Guide 2", "guide-category": "advanced" } },
      { data: { title: "Guide 3", "guide-category": "tips" } },
    ];

    const result = guidesByCategory(guidePages, "advanced");

    expect(result.length).toBe(1);
    expect(result[0].data.title).toBe("Guide 2");
  });

  test("Returns empty array when no guides match category", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
      { data: { title: "Guide 2", "guide-category": "advanced" } },
    ];

    const result = guidesByCategory(guidePages, "nonexistent");

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined guide pages", () => {
    expect(guidesByCategory(null, "getting-started")).toEqual([]);
    expect(guidesByCategory(undefined, "getting-started")).toEqual([]);
  });

  test("Handles null/undefined category slug", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
    ];

    expect(guidesByCategory(guidePages, null)).toEqual([]);
    expect(guidesByCategory(guidePages, undefined)).toEqual([]);
  });

  test("Handles empty guide pages array", () => {
    const result = guidesByCategory([], "getting-started");

    expect(result).toEqual([]);
  });

  test("Skips guides without guide-category field", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
      { data: { title: "Guide 2" } },
      { data: { title: "Guide 3", "guide-category": "getting-started" } },
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expect(result.length).toBe(2);
  });

  test("Category matching is case-sensitive", () => {
    const guidePages = [
      { data: { title: "Guide 1", "guide-category": "Getting-Started" } },
      { data: { title: "Guide 2", "guide-category": "getting-started" } },
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expect(result.length).toBe(1);
    expect(result[0].data.title).toBe("Guide 2");
  });

  test("Does not modify input array", () => {
    const originalPages = [
      { data: { title: "Guide 1", "guide-category": "getting-started" } },
      { data: { title: "Guide 2", "guide-category": "advanced" } },
    ];

    const pagesCopy = structuredClone(originalPages);

    guidesByCategory(pagesCopy, "getting-started");

    expect(pagesCopy).toEqual(originalPages);
  });

  test("Adds guide-categories and guide-pages collections", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(typeof mockConfig.collections["guide-categories"]).toBe("function");
    expect(typeof mockConfig.collections["guide-pages"]).toBe("function");
  });

  test("Adds guidesByCategory filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(typeof mockConfig.filters.guidesByCategory).toBe("function");
    expect(mockConfig.filters.guidesByCategory).toBe(guidesByCategory);
  });

  test("Collection functions filter by correct tags", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "guide-category") return [{ slug: "cat-1" }];
        if (tag === "guide-page") return [{ slug: "page-1" }];
        return [];
      },
    };

    const categories =
      mockConfig.collections["guide-categories"](mockCollectionApi);
    const pages = mockConfig.collections["guide-pages"](mockCollectionApi);

    expect(categories.length).toBe(1);
    expect(categories[0].slug).toBe("cat-1");
    expect(pages.length).toBe(1);
    expect(pages[0].slug).toBe("page-1");
  });
});
