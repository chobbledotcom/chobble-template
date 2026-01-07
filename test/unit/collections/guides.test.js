import { describe, expect, test } from "bun:test";
import { configureGuides, guidesByCategory } from "#collections/guides.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

/** Create a guide page with title and category */
const guide = (title, category) => ({
  data: { title, ...(category && { "guide-category": category }) },
});

describe("guides", () => {
  test("Filters guide pages by category slug", () => {
    const guidePages = [
      guide("Guide 1", "getting-started"),
      guide("Guide 2", "advanced"),
      guide("Guide 3", "getting-started"),
      guide("Guide 4", "tips"),
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expectResultTitles(result, ["Guide 1", "Guide 3"]);
  });

  test("Returns single guide when only one matches", () => {
    const guidePages = [
      guide("Guide 1", "getting-started"),
      guide("Guide 2", "advanced"),
      guide("Guide 3", "tips"),
    ];

    const result = guidesByCategory(guidePages, "advanced");

    expectResultTitles(result, ["Guide 2"]);
  });

  test("Returns empty array when no guides match category", () => {
    const guidePages = [
      guide("Guide 1", "getting-started"),
      guide("Guide 2", "advanced"),
    ];

    const result = guidesByCategory(guidePages, "nonexistent");

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined guide pages", () => {
    expect(guidesByCategory(null, "getting-started")).toEqual([]);
    expect(guidesByCategory(undefined, "getting-started")).toEqual([]);
  });

  test("Handles null/undefined category slug", () => {
    const guidePages = [guide("Guide 1", "getting-started")];

    expect(guidesByCategory(guidePages, null)).toEqual([]);
    expect(guidesByCategory(guidePages, undefined)).toEqual([]);
  });

  test("Handles empty guide pages array", () => {
    const result = guidesByCategory([], "getting-started");

    expect(result).toEqual([]);
  });

  test("Skips guides without guide-category field", () => {
    const guidePages = [
      guide("Guide 1", "getting-started"),
      guide("Guide 2"), // no category
      guide("Guide 3", "getting-started"),
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expect(result.length).toBe(2);
  });

  test("Category matching is case-sensitive", () => {
    const guidePages = [
      guide("Guide 1", "Getting-Started"),
      guide("Guide 2", "getting-started"),
    ];

    const result = guidesByCategory(guidePages, "getting-started");

    expectResultTitles(result, ["Guide 2"]);
  });

  test("Does not modify input array", () => {
    const originalPages = [
      guide("Guide 1", "getting-started"),
      guide("Guide 2", "advanced"),
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
