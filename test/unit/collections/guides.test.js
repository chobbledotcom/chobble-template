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

/** Create multiple guides from [title, category] pairs */
const guides = (pairs) =>
  pairs.map(([title, category]) => guide(title, category));

describe("guides", () => {
  test("Filters guide pages by category slug", () => {
    const guidePages = guides([
      ["Guide 1", "getting-started"],
      ["Guide 2", "advanced"],
      ["Guide 3", "getting-started"],
      ["Guide 4", "tips"],
    ]);

    const result = guidesByCategory(guidePages, "getting-started");

    expectResultTitles(result, ["Guide 1", "Guide 3"]);
  });

  test("Returns single guide when only one matches", () => {
    const guidePages = guides([
      ["Guide 1", "getting-started"],
      ["Guide 2", "advanced"],
      ["Guide 3", "tips"],
    ]);

    const result = guidesByCategory(guidePages, "advanced");

    expectResultTitles(result, ["Guide 2"]);
  });

  test("Returns empty array when no guides match category", () => {
    const guidePages = guides([
      ["Guide 1", "getting-started"],
      ["Guide 2", "advanced"],
    ]);

    const result = guidesByCategory(guidePages, "nonexistent");

    expect(result.length).toBe(0);
  });

  test("Handles empty guide pages array", () => {
    const result = guidesByCategory([], "getting-started");

    expect(result).toEqual([]);
  });

  test("Skips guides without guide-category field", () => {
    const guidePages = guides([
      ["Guide 1", "getting-started"],
      ["Guide 2"], // no category
      ["Guide 3", "getting-started"],
    ]);

    const result = guidesByCategory(guidePages, "getting-started");

    expect(result.length).toBe(2);
  });

  test("Category matching is case-sensitive", () => {
    const guidePages = guides([
      ["Guide 1", "Getting-Started"],
      ["Guide 2", "getting-started"],
    ]);

    const result = guidesByCategory(guidePages, "getting-started");

    expectResultTitles(result, ["Guide 2"]);
  });

  test("Does not modify input array", () => {
    const originalPages = guides([
      ["Guide 1", "getting-started"],
      ["Guide 2", "advanced"],
    ]);

    const pagesCopy = structuredClone(originalPages);

    guidesByCategory(pagesCopy, "getting-started");

    expect(pagesCopy).toEqual(originalPages);
  });

  test("Adds guidesByCategory filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(typeof mockConfig.filters.guidesByCategory).toBe("function");
    expect(mockConfig.filters.guidesByCategory).toBe(guidesByCategory);
  });
});
