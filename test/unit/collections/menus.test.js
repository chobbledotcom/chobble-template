import { describe, expect, test } from "bun:test";
import {
  configureMenus,
  getCategoriesByMenu,
  getItemsByCategory,
} from "#collections/menus.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

describe("menus", () => {
  // getCategoriesByMenu tests
  test("Returns categories for a given menu slug", () => {
    const categories = [
      {
        data: { menus: ["lunch", "dinner"], title: "Appetizers" },
      },
      {
        data: { menus: ["lunch"], title: "Sandwiches" },
      },
      {
        data: { menus: ["dinner"], title: "Entrees" },
      },
    ];

    const lunchCategories = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(lunchCategories, ["Appetizers", "Sandwiches"]);
  });

  test("Returns empty array when no categories match menu", () => {
    const categories = [
      {
        data: { menus: ["lunch"], title: "Sandwiches" },
      },
    ];

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

  test("Skips categories without menus property", () => {
    const categories = [
      {
        data: { title: "No Menus" },
      },
      {
        data: { menus: ["lunch"], title: "Has Menus" },
      },
      {
        data: { menus: null, title: "Null Menus" },
      },
    ];

    const result = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(result, ["Has Menus"]);
  });

  test("Category can belong to multiple menus", () => {
    const categories = [
      {
        data: { menus: ["breakfast", "lunch", "dinner"], title: "All Day" },
      },
    ];

    const breakfast = getCategoriesByMenu(categories, "breakfast");
    const lunch = getCategoriesByMenu(categories, "lunch");
    const dinner = getCategoriesByMenu(categories, "dinner");

    expect(breakfast).toHaveLength(1);
    expect(lunch).toHaveLength(1);
    expect(dinner).toHaveLength(1);
  });

  // getItemsByCategory tests
  test("Returns items for a given category slug", () => {
    const items = [
      {
        data: { menu_category: "appetizers", title: "Spring Rolls" },
      },
      {
        data: { menu_category: "appetizers", title: "Soup" },
      },
      {
        data: { menu_category: "mains", title: "Steak" },
      },
    ];

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["Spring Rolls", "Soup"]);
  });

  test("Handles menu_categories array", () => {
    const items = [
      {
        data: {
          menu_categories: ["appetizers", "shareables"],
          title: "Nachos",
        },
      },
      {
        data: { menu_categories: ["appetizers"], title: "Wings" },
      },
    ];

    const appetizers = getItemsByCategory(items, "appetizers");
    const shareables = getItemsByCategory(items, "shareables");

    expect(appetizers).toHaveLength(2);
    expect(shareables).toHaveLength(1);
  });

  test("Handles mix of menu_category and menu_categories", () => {
    const items = [
      {
        data: { menu_category: "drinks", title: "Soda" },
      },
      {
        data: { menu_categories: ["drinks", "specials"], title: "Cocktail" },
      },
    ];

    const result = getItemsByCategory(items, "drinks");

    expect(result).toHaveLength(2);
  });

  test("Returns empty array when no items match category", () => {
    const items = [
      {
        data: { menu_category: "appetizers", title: "Spring Rolls" },
      },
    ];

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

  test("Skips items without category properties", () => {
    const items = [
      {
        data: { title: "No Category" },
      },
      {
        data: { menu_category: "appetizers", title: "Has Category" },
      },
      {
        data: { menu_category: null, title: "Null Category" },
      },
      {
        data: { menu_categories: null, title: "Null Categories Array" },
      },
    ];

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["Has Category"]);
  });

  test("Handles empty menu_categories array", () => {
    const items = [
      {
        data: { menu_categories: [], title: "Empty Categories" },
      },
      {
        data: { menu_category: "appetizers", title: "Has Category" },
      },
    ];

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

    const categories = [
      {
        data: { menus: ["lunch"], title: "Sandwiches" },
      },
    ];

    const items = [
      {
        data: { menu_category: "sandwiches", title: "BLT" },
      },
    ];

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
  test("Returns consistent results for same input", () => {
    const categories = [
      {
        data: { menus: ["lunch"], title: "Sandwiches" },
      },
      {
        data: { menus: ["lunch", "dinner"], title: "Salads" },
      },
    ];

    const result1 = getCategoriesByMenu(categories, "lunch");
    const result2 = getCategoriesByMenu(categories, "lunch");

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(2);
  });

  test("Returns consistent results for same input", () => {
    const items = [
      {
        data: { menu_category: "appetizers", title: "Wings" },
      },
      {
        data: { menu_category: "appetizers", title: "Fries" },
      },
    ];

    const result1 = getItemsByCategory(items, "appetizers");
    const result2 = getItemsByCategory(items, "appetizers");

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(2);
  });

  // Edge cases
  test("Preserves order of categories as encountered", () => {
    const categories = [
      {
        data: { menus: ["lunch"], title: "First" },
      },
      {
        data: { menus: ["lunch"], title: "Second" },
      },
      {
        data: { menus: ["lunch"], title: "Third" },
      },
    ];

    const result = getCategoriesByMenu(categories, "lunch");

    expectResultTitles(result, ["First", "Second", "Third"]);
  });

  test("Preserves order of items as encountered", () => {
    const items = [
      {
        data: { menu_category: "appetizers", title: "First" },
      },
      {
        data: { menu_category: "appetizers", title: "Second" },
      },
      {
        data: { menu_category: "appetizers", title: "Third" },
      },
    ];

    const result = getItemsByCategory(items, "appetizers");

    expectResultTitles(result, ["First", "Second", "Third"]);
  });

  test("Same item can appear in multiple category lookups", () => {
    const items = [
      {
        data: {
          menu_categories: ["appetizers", "shareables", "specials"],
          title: "Popular Item",
        },
      },
    ];

    const appetizers = getItemsByCategory(items, "appetizers");
    const shareables = getItemsByCategory(items, "shareables");
    const specials = getItemsByCategory(items, "specials");

    expect(appetizers).toHaveLength(1);
    expect(shareables).toHaveLength(1);
    expect(specials).toHaveLength(1);
    expect(appetizers[0]).toBe(shareables[0]);
  });
});
