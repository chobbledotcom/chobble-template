import {
  configureMenus,
  getCategoriesByMenu,
  getItemsByCategory,
} from "#collections/menus.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectArrayLength,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "#test/test-utils.js";

const testCases = [
  // getCategoriesByMenu tests
  {
    name: "getCategoriesByMenu-basic",
    description: "Returns categories for a given menu slug",
    test: () => {
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

      expectArrayLength(lunchCategories, 2, "Should return 2 lunch categories");
      expectStrictEqual(
        lunchCategories[0].data.title,
        "Appetizers",
        "First category should be Appetizers",
      );
      expectStrictEqual(
        lunchCategories[1].data.title,
        "Sandwiches",
        "Second category should be Sandwiches",
      );
    },
  },
  {
    name: "getCategoriesByMenu-no-match",
    description: "Returns empty array when no categories match menu",
    test: () => {
      const categories = [
        {
          data: { menus: ["lunch"], title: "Sandwiches" },
        },
      ];

      const result = getCategoriesByMenu(categories, "breakfast");

      expectArrayLength(
        result,
        0,
        "Should return empty array for non-matching menu",
      );
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getCategoriesByMenu-empty-categories",
    description: "Handles empty categories array",
    test: () => {
      const result = getCategoriesByMenu([], "lunch");

      expectArrayLength(result, 0, "Should return empty array");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getCategoriesByMenu-null-categories",
    description: "Handles null categories gracefully",
    test: () => {
      const result = getCategoriesByMenu(null, "lunch");

      expectArrayLength(result, 0, "Should return empty array for null");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getCategoriesByMenu-undefined-categories",
    description: "Handles undefined categories gracefully",
    test: () => {
      const result = getCategoriesByMenu(undefined, "lunch");

      expectArrayLength(result, 0, "Should return empty array for undefined");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getCategoriesByMenu-categories-without-menus",
    description: "Skips categories without menus property",
    test: () => {
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

      expectArrayLength(result, 1, "Should only return categories with menus");
      expectStrictEqual(
        result[0].data.title,
        "Has Menus",
        "Should return correct category",
      );
    },
  },
  {
    name: "getCategoriesByMenu-multiple-menus",
    description: "Category can belong to multiple menus",
    test: () => {
      const categories = [
        {
          data: { menus: ["breakfast", "lunch", "dinner"], title: "All Day" },
        },
      ];

      const breakfast = getCategoriesByMenu(categories, "breakfast");
      const lunch = getCategoriesByMenu(categories, "lunch");
      const dinner = getCategoriesByMenu(categories, "dinner");

      expectArrayLength(breakfast, 1, "Should find in breakfast");
      expectArrayLength(lunch, 1, "Should find in lunch");
      expectArrayLength(dinner, 1, "Should find in dinner");
    },
  },
  // getItemsByCategory tests
  {
    name: "getItemsByCategory-basic",
    description: "Returns items for a given category slug",
    test: () => {
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

      expectArrayLength(result, 2, "Should return 2 appetizer items");
      expectStrictEqual(
        result[0].data.title,
        "Spring Rolls",
        "First item should be Spring Rolls",
      );
      expectStrictEqual(
        result[1].data.title,
        "Soup",
        "Second item should be Soup",
      );
    },
  },
  {
    name: "getItemsByCategory-array-categories",
    description: "Handles menu_categories array",
    test: () => {
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

      expectArrayLength(appetizers, 2, "Should return 2 appetizer items");
      expectArrayLength(shareables, 1, "Should return 1 shareable item");
    },
  },
  {
    name: "getItemsByCategory-mixed-single-and-array",
    description: "Handles mix of menu_category and menu_categories",
    test: () => {
      const items = [
        {
          data: { menu_category: "drinks", title: "Soda" },
        },
        {
          data: { menu_categories: ["drinks", "specials"], title: "Cocktail" },
        },
      ];

      const result = getItemsByCategory(items, "drinks");

      expectArrayLength(result, 2, "Should return both items");
    },
  },
  {
    name: "getItemsByCategory-no-match",
    description: "Returns empty array when no items match category",
    test: () => {
      const items = [
        {
          data: { menu_category: "appetizers", title: "Spring Rolls" },
        },
      ];

      const result = getItemsByCategory(items, "desserts");

      expectArrayLength(result, 0, "Should return empty array");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getItemsByCategory-empty-items",
    description: "Handles empty items array",
    test: () => {
      const result = getItemsByCategory([], "appetizers");

      expectArrayLength(result, 0, "Should return empty array");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getItemsByCategory-null-items",
    description: "Handles null items gracefully",
    test: () => {
      const result = getItemsByCategory(null, "appetizers");

      expectArrayLength(result, 0, "Should return empty array for null");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getItemsByCategory-undefined-items",
    description: "Handles undefined items gracefully",
    test: () => {
      const result = getItemsByCategory(undefined, "appetizers");

      expectArrayLength(result, 0, "Should return empty array for undefined");
      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "getItemsByCategory-items-without-categories",
    description: "Skips items without category properties",
    test: () => {
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

      expectArrayLength(
        result,
        1,
        "Should only return items with matching category",
      );
      expectStrictEqual(
        result[0].data.title,
        "Has Category",
        "Should return correct item",
      );
    },
  },
  {
    name: "getItemsByCategory-empty-menu-categories-array",
    description: "Handles empty menu_categories array",
    test: () => {
      const items = [
        {
          data: { menu_categories: [], title: "Empty Categories" },
        },
        {
          data: { menu_category: "appetizers", title: "Has Category" },
        },
      ];

      const result = getItemsByCategory(items, "appetizers");

      expectArrayLength(result, 1, "Should only match item with category");
      expectStrictEqual(
        result[0].data.title,
        "Has Category",
        "Should return correct item",
      );
    },
  },
  // configureMenus tests
  {
    name: "configureMenus-basic",
    description: "Configures menu filters in Eleventy",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureMenus(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "getCategoriesByMenu",
        "Should add getCategoriesByMenu filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getItemsByCategory",
        "Should add getItemsByCategory filter",
      );
    },
  },
  {
    name: "configureMenus-filters-work",
    description: "Configured filters work correctly",
    test: () => {
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

      expectArrayLength(categoryResult, 1, "getCategoriesByMenu filter works");
      expectArrayLength(itemResult, 1, "getItemsByCategory filter works");
    },
  },
  // Memoization tests
  {
    name: "getCategoriesByMenu-memoization",
    description: "Returns consistent results for same input",
    test: () => {
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

      expectDeepEqual(
        result1,
        result2,
        "Should return same result for same input",
      );
      expectArrayLength(result1, 2, "Should have correct length");
    },
  },
  {
    name: "getItemsByCategory-memoization",
    description: "Returns consistent results for same input",
    test: () => {
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

      expectDeepEqual(
        result1,
        result2,
        "Should return same result for same input",
      );
      expectArrayLength(result1, 2, "Should have correct length");
    },
  },
  // Edge cases
  {
    name: "getCategoriesByMenu-preserves-category-order",
    description: "Preserves order of categories as encountered",
    test: () => {
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

      expectStrictEqual(
        result[0].data.title,
        "First",
        "First category preserved",
      );
      expectStrictEqual(
        result[1].data.title,
        "Second",
        "Second category preserved",
      );
      expectStrictEqual(
        result[2].data.title,
        "Third",
        "Third category preserved",
      );
    },
  },
  {
    name: "getItemsByCategory-preserves-item-order",
    description: "Preserves order of items as encountered",
    test: () => {
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

      expectStrictEqual(result[0].data.title, "First", "First item preserved");
      expectStrictEqual(
        result[1].data.title,
        "Second",
        "Second item preserved",
      );
      expectStrictEqual(result[2].data.title, "Third", "Third item preserved");
    },
  },
  {
    name: "getItemsByCategory-item-in-multiple-categories",
    description: "Same item can appear in multiple category lookups",
    test: () => {
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

      expectArrayLength(appetizers, 1, "Found in appetizers");
      expectArrayLength(shareables, 1, "Found in shareables");
      expectArrayLength(specials, 1, "Found in specials");
      expectStrictEqual(
        appetizers[0],
        shareables[0],
        "Same item object returned",
      );
    },
  },
];

export default createTestRunner("menus", testCases);
