import { describe, expect, test } from "bun:test";
import {
  configureGuides,
  generalGuides,
  guideCategoriesByProperty,
  guidesByCategory,
  guidesForProperty,
} from "#collections/guides.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

/** Create a guide page with name and category */
const guide = (name, category) => ({
  data: { name, ...(category && { "guide-category": category }) },
});

/** Create multiple guides from [name, category] pairs */
const guides = (pairs) =>
  pairs.map(([name, category]) => guide(name, category));

/** Create a guide category with name and optional property */
const guideCategory = (name, property) => ({
  data: { name, ...(property && { property }) },
});

/** Create a guide page inside a category, optionally tied to a property */
const categorisedGuide = (name, property) => ({
  data: {
    name,
    "guide-category": "about-the-accommodation",
    ...(property && { property }),
  },
});

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

  test("Adds guideCategoriesByProperty filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(typeof mockConfig.filters.guideCategoriesByProperty).toBe(
      "function",
    );
    expect(mockConfig.filters.guideCategoriesByProperty).toBe(
      guideCategoriesByProperty,
    );
  });

  test("Adds generalGuides filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(mockConfig.filters.generalGuides).toBe(generalGuides);
  });

  test("Adds guidesForProperty filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureGuides(mockConfig);

    expect(mockConfig.filters.guidesForProperty).toBe(guidesForProperty);
  });
});

describe("generalGuides", () => {
  test("Keeps only guides with no property of their own", () => {
    const categories = [
      guideCategory("Getting Started"),
      guideCategory("Lighting the Fire", "seaside-cottage"),
      guideCategory("Local Area"),
    ];

    expectResultTitles(generalGuides(categories), [
      "Getting Started",
      "Local Area",
    ]);
  });

  test("Returns empty array when every guide belongs to a property", () => {
    const categories = [
      guideCategory("Getting Started", "seaside-cottage"),
      guideCategory("Advanced", "mountain-lodge"),
    ];

    expect(generalGuides(categories)).toEqual([]);
  });

  test("Handles empty guides array", () => {
    expect(generalGuides([])).toEqual([]);
  });
});

describe("guidesForProperty", () => {
  test("Keeps the property's own guides alongside the general ones", () => {
    const guidePages = [
      categorisedGuide("Lighting the Fire", "seaside-cottage"),
      categorisedGuide("Hot Water", "mountain-lodge"),
      categorisedGuide("Local Walks"),
    ];

    expectResultTitles(guidesForProperty(guidePages, "seaside-cottage"), [
      "Lighting the Fire",
      "Local Walks",
    ]);
  });

  test("Matches a property reference written as a CMS path", () => {
    const guidePages = [
      categorisedGuide("Lighting the Fire", "properties/seaside-cottage.md"),
      categorisedGuide("Hot Water", "mountain-lodge"),
    ];

    expectResultTitles(guidesForProperty(guidePages, "seaside-cottage"), [
      "Lighting the Fire",
    ]);
  });

  test("Drops every property-specific guide when there is no property", () => {
    const guidePages = [
      categorisedGuide("Lighting the Fire", "seaside-cottage"),
      categorisedGuide("Local Walks"),
    ];

    expectResultTitles(guidesForProperty(guidePages, undefined), [
      "Local Walks",
    ]);
  });

  test("Does not modify the input array", () => {
    const originalPages = [
      categorisedGuide("Lighting the Fire", "seaside-cottage"),
      categorisedGuide("Local Walks"),
    ];
    const pagesCopy = structuredClone(originalPages);

    guidesForProperty(pagesCopy, "seaside-cottage");

    expect(pagesCopy).toEqual(originalPages);
  });
});

describe("guideCategoriesByProperty", () => {
  test("Filters guide categories by property slug", () => {
    const categories = [
      guideCategory("Getting Started", "seaside-cottage"),
      guideCategory("Advanced", "mountain-lodge"),
      guideCategory("Tips", "seaside-cottage"),
    ];

    const result = guideCategoriesByProperty(categories, "seaside-cottage");

    expectResultTitles(result, ["Getting Started", "Tips"]);
  });

  test("Returns empty array when no categories match property", () => {
    const categories = [
      guideCategory("Getting Started", "seaside-cottage"),
      guideCategory("Advanced", "mountain-lodge"),
    ];

    const result = guideCategoriesByProperty(categories, "nonexistent");

    expect(result).toEqual([]);
  });

  test("Handles empty categories array", () => {
    const result = guideCategoriesByProperty([], "seaside-cottage");

    expect(result).toEqual([]);
  });

  test("Skips categories without property field", () => {
    const categories = [
      guideCategory("Getting Started", "seaside-cottage"),
      guideCategory("Advanced"), // no property
      guideCategory("Tips", "seaside-cottage"),
    ];

    expectResultTitles(
      guideCategoriesByProperty(categories, "seaside-cottage"),
      ["Getting Started", "Tips"],
    );
  });
});
