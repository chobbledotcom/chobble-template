import { describe, expect, test } from "bun:test";
import {
  configureMenus,
  getCategoriesByMenu,
  getItemsByCategory,
} from "#collections/menus.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
  getCollectionFrom,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Category factory: creates { data: { title, menus } } items */
const category = data({})("title", "menus");

/** Menu item factory: creates { data: { title, menu_categories } } items */
const menuItem = data({})("title", "menu_categories");

describe("menus", () => {
  // getCategoriesByMenu tests
  test("Returns categories for a given menu slug", () => {
    const categories = category(
      ["Appetizers", ["lunch", "dinner"]],
      ["Sandwiches", ["lunch"]],
      ["Entrees", ["dinner"]],
    );

    const lunchCategories = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(lunchCategories, ["Appetizers", "Sandwiches"]);
  });

  test("Returns empty array when no categories match menu", () => {
    const categories = category(["Sandwiches", ["lunch"]]);

    const result = getCategoriesByMenu(categories, "breakfast");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("Handles empty categories array", () => {
    const result = getCategoriesByMenu([], "lunch");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("Returns empty array when categories is undefined", () => {
    const result = getCategoriesByMenu(undefined, "lunch");

    expect(result).toEqual([]);
  });

  test("Skips categories with empty menus array", () => {
    const categories = category(
      ["No Menus", []],
      ["Has Menus", ["lunch"]],
      ["Empty Menus", []],
    );

    const result = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(result, ["Has Menus"]);
  });

  test("Category can belong to multiple menus", () => {
    const categories = category(["All Day", ["breakfast", "lunch", "dinner"]]);

    const breakfast = getCategoriesByMenu(categories, "breakfast");
    const lunch = getCategoriesByMenu(categories, "lunch");
    const dinner = getCategoriesByMenu(categories, "dinner");

    expect(breakfast).toHaveLength(1);
    expect(lunch).toHaveLength(1);
    expect(dinner).toHaveLength(1);
  });

  // getItemsByCategory tests
  test("Returns items for a given category slug", () => {
    const items = menuItem(
      ["Spring Rolls", ["appetizers"]],
      ["Soup", ["appetizers"]],
      ["Steak", ["mains"]],
    );

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["Spring Rolls", "Soup"]);
  });

  test("Handles menu_categories array with multiple categories", () => {
    const items = menuItem(
      ["Nachos", ["appetizers", "shareables"]],
      ["Wings", ["appetizers"]],
    );

    const appetizers = getItemsByCategory(items, "appetizers");
    const shareables = getItemsByCategory(items, "shareables");

    expect(appetizers).toHaveLength(2);
    expect(shareables).toHaveLength(1);
  });

  test("Returns empty array when no items match category", () => {
    const items = menuItem(["Spring Rolls", ["appetizers"]]);

    const result = getItemsByCategory(items, "desserts");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("Handles empty items array", () => {
    const result = getItemsByCategory([], "appetizers");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("Returns empty array when items is undefined", () => {
    const result = getItemsByCategory(undefined, "appetizers");

    expect(result).toEqual([]);
  });

  test("Skips items with empty menu_categories array", () => {
    const items = menuItem(
      ["No Category", []],
      ["Has Category", ["appetizers"]],
      ["Empty Categories", []],
    );

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["Has Category"]);
  });

  test("Handles empty menu_categories array", () => {
    const items = menuItem(
      ["Empty Categories", []],
      ["Has Category", ["appetizers"]],
    );

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["Has Category"]);
  });

  // configureMenus tests
  test("Configures menu filters in Eleventy", () => {
    const mockConfig = createMockEleventyConfig();

    configureMenus(mockConfig);

    expect(typeof mockConfig.filters.getCategoriesByMenu).toBe("function");
    expect(typeof mockConfig.filters.getItemsByCategory).toBe("function");
  });

  test("Configured filters work correctly", () => {
    const mockConfig = createMockEleventyConfig();
    configureMenus(mockConfig);

    const categories = category(["Sandwiches", ["lunch"]]);
    const items = menuItem(["BLT", ["sandwiches"]]);

    const categoryResult = mockConfig.filters.getCategoriesByMenu(
      categories,
      "lunch",
    );
    const itemResult = mockConfig.filters.getItemsByCategory(
      items,
      "sandwiches",
    );

    expect(categoryResult).toHaveLength(1);
    expect(itemResult).toHaveLength(1);
  });

  // Memoization tests
  test("Returns consistent results for same category input", () => {
    const categories = category(
      ["Sandwiches", ["lunch"]],
      ["Salads", ["lunch", "dinner"]],
    );

    const result1 = getCategoriesByMenu(categories, "lunch");
    const result2 = getCategoriesByMenu(categories, "lunch");

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(2);
  });

  test("Returns consistent results for same item input", () => {
    const items = menuItem(
      ["Wings", ["appetizers"]],
      ["Fries", ["appetizers"]],
    );

    const result1 = getItemsByCategory(items, "appetizers");
    const result2 = getItemsByCategory(items, "appetizers");

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(2);
  });

  // Edge cases
  test("Preserves order of categories as encountered", () => {
    const categories = category(
      ["First", ["lunch"]],
      ["Second", ["lunch"]],
      ["Third", ["lunch"]],
    );

    const result = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(result, ["First", "Second", "Third"]);
  });

  test("Preserves order of items as encountered", () => {
    const items = menuItem(
      ["First", ["appetizers"]],
      ["Second", ["appetizers"]],
      ["Third", ["appetizers"]],
    );

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["First", "Second", "Third"]);
  });

  test("Same item can appear in multiple category lookups", () => {
    const items = menuItem([
      "Popular Item",
      ["appetizers", "shareables", "specials"],
    ]);

    const appetizers = getItemsByCategory(items, "appetizers");
    const shareables = getItemsByCategory(items, "shareables");
    const specials = getItemsByCategory(items, "specials");

    expect(appetizers).toHaveLength(1);
    expect(shareables).toHaveLength(1);
    expect(specials).toHaveLength(1);
    expect(appetizers[0]).toBe(shareables[0]);
  });
});

describe("menus collection", () => {
  const getCollection = getCollectionFrom("menus")(configureMenus);

  test("returns menus sorted by order", () => {
    const menus = [
      { data: { title: "Dinner", order: 3 }, fileSlug: "dinner" },
      { data: { title: "Brunch", order: 1 }, fileSlug: "brunch" },
      { data: { title: "Lunch", order: 2 }, fileSlug: "lunch" },
    ];
    const result = getCollection({ menus });
    expectResultTitles(result, ["Brunch", "Lunch", "Dinner"]);
  });
});
