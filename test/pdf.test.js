import {
  buildMenuPdfData,
  configurePdf,
  createMenuPdfTemplate,
} from "#eleventy/pdf.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectArrayLength,
  expectDeepEqual,
  expectFalse,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

// Helper to create mock menu
const createMockMenu = (slug, title, subtitle = null) => ({
  fileSlug: slug,
  data: {
    title,
    subtitle,
  },
});

// Helper to create mock menu category
const createMockCategory = (slug, name, menus, templateContent = null) => ({
  fileSlug: slug,
  data: {
    name,
    menus,
    order: 0,
  },
  templateContent,
});

// Helper to create mock menu item
const createMockMenuItem = (
  name,
  categories,
  price,
  description = null,
  dietaryKeys = [],
) => ({
  data: {
    name,
    menu_categories: categories,
    price,
    description,
    dietaryKeys,
  },
});

const testCases = [
  // buildMenuPdfData tests
  {
    name: "buildMenuPdfData-basic",
    description: "Builds PDF data from menu with categories and items",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch Menu", "Served 11am-3pm");
      const categories = [
        createMockCategory("appetizers", "Appetizers", ["lunch"]),
        createMockCategory("mains", "Main Courses", ["lunch"]),
      ];
      const items = [
        createMockMenuItem("Spring Rolls", ["appetizers"], "$8.99"),
        createMockMenuItem("Grilled Salmon", ["mains"], "$24.99"),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.menuTitle,
        "Lunch Menu",
        "Should have menu title",
      );
      expectStrictEqual(
        result.subtitle,
        "Served 11am-3pm",
        "Should have subtitle",
      );
      expectArrayLength(result.categories, 2, "Should have 2 categories");
      expectStrictEqual(
        result.categories[0].name,
        "Appetizers",
        "First category should be Appetizers",
      );
    },
  },
  {
    name: "buildMenuPdfData-empty-subtitle",
    description: "Handles missing subtitle",
    test: () => {
      const menu = createMockMenu("dinner", "Dinner Menu");
      const categories = [];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.menuTitle,
        "Dinner Menu",
        "Should have menu title",
      );
      expectStrictEqual(result.subtitle, "", "Should have empty subtitle");
    },
  },
  {
    name: "buildMenuPdfData-filters-categories-by-menu",
    description: "Only includes categories that belong to the menu",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [
        createMockCategory("lunch-apps", "Lunch Appetizers", ["lunch"]),
        createMockCategory("dinner-apps", "Dinner Appetizers", ["dinner"]),
        createMockCategory("shared", "Shared Items", ["lunch", "dinner"]),
      ];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expectArrayLength(
        result.categories,
        2,
        "Should only include lunch and shared categories",
      );
      expectStrictEqual(
        result.categories[0].name,
        "Lunch Appetizers",
        "Should include lunch category",
      );
      expectStrictEqual(
        result.categories[1].name,
        "Shared Items",
        "Should include shared category",
      );
    },
  },
  {
    name: "buildMenuPdfData-filters-items-by-category",
    description: "Items are correctly filtered into their categories",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [
        createMockCategory("appetizers", "Appetizers", ["lunch"]),
        createMockCategory("mains", "Mains", ["lunch"]),
      ];
      const items = [
        createMockMenuItem("Soup", ["appetizers"], "$6"),
        createMockMenuItem("Salad", ["appetizers"], "$8"),
        createMockMenuItem("Burger", ["mains"], "$12"),
        createMockMenuItem("Pasta", ["desserts"], "$10"), // Different category
      ];

      const result = buildMenuPdfData(menu, categories, items);

      expectArrayLength(
        result.categories[0].items,
        2,
        "Appetizers should have 2 items",
      );
      expectArrayLength(
        result.categories[1].items,
        1,
        "Mains should have 1 item",
      );
    },
  },
  {
    name: "buildMenuPdfData-item-structure",
    description: "Menu items have correct structure in PDF data",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [
        createMockMenuItem(
          "Spring Rolls",
          ["apps"],
          "$8.99",
          "Crispy and delicious",
        ),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      const item = result.categories[0].items[0];
      expectStrictEqual(item.name, "Spring Rolls", "Should have item name");
      expectStrictEqual(item.price, "$8.99", "Should have item price");
      expectStrictEqual(
        item.description,
        "Crispy and delicious",
        "Should have item description",
      );
    },
  },
  {
    name: "buildMenuPdfData-dietary-symbols",
    description: "Dietary symbols are joined correctly",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [
        createMockMenuItem("Veggie Roll", ["apps"], "$7", null, [
          { symbol: "V", label: "Vegetarian" },
          { symbol: "GF", label: "Gluten Free" },
        ]),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      const item = result.categories[0].items[0];
      expectStrictEqual(
        item.dietarySymbols,
        "V GF",
        "Should join dietary symbols with space",
      );
    },
  },
  {
    name: "buildMenuPdfData-dietary-key-string",
    description: "Builds dietary key string from all items",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [
        createMockMenuItem("Item 1", ["apps"], "$5", null, [
          { symbol: "V", label: "Vegetarian" },
        ]),
        createMockMenuItem("Item 2", ["apps"], "$6", null, [
          { symbol: "GF", label: "Gluten Free" },
        ]),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      expectTrue(
        result.hasDietaryKeys,
        "Should indicate dietary keys are present",
      );
      expectTrue(
        result.dietaryKeyString.includes("(V) Vegetarian"),
        "Should include vegetarian key",
      );
      expectTrue(
        result.dietaryKeyString.includes("(GF) Gluten Free"),
        "Should include gluten free key",
      );
    },
  },
  {
    name: "buildMenuPdfData-no-dietary-keys",
    description: "Handles items without dietary keys",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Burger", ["apps"], "$12")];

      const result = buildMenuPdfData(menu, categories, items);

      expectFalse(
        result.hasDietaryKeys,
        "Should indicate no dietary keys present",
      );
      expectStrictEqual(
        result.dietaryKeyString,
        "",
        "Should have empty key string",
      );
    },
  },
  {
    name: "buildMenuPdfData-deduplicates-dietary-keys",
    description: "Same dietary key from multiple items appears only once",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [
        createMockMenuItem("Item 1", ["apps"], "$5", null, [
          { symbol: "V", label: "Vegetarian" },
        ]),
        createMockMenuItem("Item 2", ["apps"], "$6", null, [
          { symbol: "V", label: "Vegetarian" },
        ]),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      const vCount = (result.dietaryKeyString.match(/\(V\)/g) || []).length;
      expectStrictEqual(vCount, 1, "Vegetarian should appear only once");
    },
  },
  {
    name: "buildMenuPdfData-category-description-strips-html",
    description: "HTML is stripped from category descriptions",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [
        createMockCategory(
          "apps",
          "Appetizers",
          ["lunch"],
          "<p>Our <strong>famous</strong> starters</p>",
        ),
      ];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.categories[0].description,
        "Our famous starters",
        "Should strip HTML tags",
      );
    },
  },
  {
    name: "buildMenuPdfData-null-categories",
    description: "Handles null categories array",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");

      const result = buildMenuPdfData(menu, null, []);

      expectArrayLength(result.categories, 0, "Should return empty categories");
    },
  },
  {
    name: "buildMenuPdfData-null-items",
    description: "Handles null items array",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];

      const result = buildMenuPdfData(menu, categories, null);

      expectArrayLength(
        result.categories[0].items,
        0,
        "Should have empty items array",
      );
    },
  },
  {
    name: "buildMenuPdfData-empty-description",
    description: "Handles items without description",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Simple Item", ["apps"], "$5", null)];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.categories[0].items[0].description,
        "",
        "Should have empty description",
      );
    },
  },
  {
    name: "buildMenuPdfData-empty-dietary-keys-array",
    description: "Handles empty dietary keys array",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Item", ["apps"], "$5", null, [])];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.categories[0].items[0].dietarySymbols,
        "",
        "Should have empty dietary symbols",
      );
    },
  },
  {
    name: "buildMenuPdfData-filters-dietary-keys-without-symbol-or-label",
    description: "Filters out dietary keys missing symbol or label",
    test: () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [
        createMockMenuItem("Item", ["apps"], "$5", null, [
          { symbol: "V", label: "Vegetarian" },
          { symbol: "", label: "Empty Symbol" },
          { symbol: "GF" },
          { label: "Missing Symbol" },
        ]),
      ];

      const result = buildMenuPdfData(menu, categories, items);

      expectStrictEqual(
        result.dietaryKeyString,
        "(V) Vegetarian",
        "Should only include complete dietary keys",
      );
    },
  },

  // createMenuPdfTemplate tests
  {
    name: "createMenuPdfTemplate-returns-object",
    description: "Returns a valid PDF template object",
    test: () => {
      const template = createMenuPdfTemplate();

      expectStrictEqual(typeof template, "object", "Should return an object");
      expectStrictEqual(template.pageSize, "A4", "Should use A4 page size");
    },
  },
  {
    name: "createMenuPdfTemplate-has-page-margins",
    description: "Template has page margins defined",
    test: () => {
      const template = createMenuPdfTemplate();

      expectDeepEqual(
        template.pageMargins,
        [40, 40, 40, 40],
        "Should have 40px margins on all sides",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-has-content-array",
    description: "Template has content array with required sections",
    test: () => {
      const template = createMenuPdfTemplate();

      expectTrue(Array.isArray(template.content), "Content should be an array");
      expectTrue(template.content.length > 0, "Content should not be empty");
    },
  },
  {
    name: "createMenuPdfTemplate-has-business-name-section",
    description: "Template includes business name placeholder",
    test: () => {
      const template = createMenuPdfTemplate();

      const businessNameSection = template.content.find(
        (section) => section.text === "{{businessName}}",
      );
      expectTrue(
        businessNameSection !== undefined,
        "Should have business name section",
      );
      expectStrictEqual(
        businessNameSection.style,
        "businessName",
        "Should use businessName style",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-has-menu-title-section",
    description: "Template includes menu title placeholder",
    test: () => {
      const template = createMenuPdfTemplate();

      const menuTitleSection = template.content.find(
        (section) => section.text === "{{menuTitle}}",
      );
      expectTrue(
        menuTitleSection !== undefined,
        "Should have menu title section",
      );
      expectStrictEqual(
        menuTitleSection.style,
        "menuTitle",
        "Should use menuTitle style",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-has-styles",
    description: "Template has all required styles defined",
    test: () => {
      const template = createMenuPdfTemplate();

      expectTrue(template.styles !== undefined, "Should have styles object");
      expectTrue(
        template.styles.businessName !== undefined,
        "Should have businessName style",
      );
      expectTrue(
        template.styles.menuTitle !== undefined,
        "Should have menuTitle style",
      );
      expectTrue(
        template.styles.categoryHeader !== undefined,
        "Should have categoryHeader style",
      );
      expectTrue(
        template.styles.itemName !== undefined,
        "Should have itemName style",
      );
      expectTrue(
        template.styles.price !== undefined,
        "Should have price style",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-styles-have-font-sizes",
    description: "Styles have appropriate font sizes",
    test: () => {
      const template = createMenuPdfTemplate();

      expectStrictEqual(
        template.styles.businessName.fontSize,
        24,
        "Business name should be 24pt",
      );
      expectStrictEqual(
        template.styles.menuTitle.fontSize,
        18,
        "Menu title should be 18pt",
      );
      expectStrictEqual(
        template.styles.categoryHeader.fontSize,
        16,
        "Category header should be 16pt",
      );
      expectStrictEqual(
        template.styles.itemName.fontSize,
        11,
        "Item name should be 11pt",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-default-font",
    description: "Template uses Helvetica as default font",
    test: () => {
      const template = createMenuPdfTemplate();

      expectStrictEqual(
        template.defaultStyle.font,
        "Helvetica",
        "Should use Helvetica font",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-has-categories-template",
    description: "Template has categories loop structure",
    test: () => {
      const template = createMenuPdfTemplate();

      const categoriesSection = template.content.find(
        (section) => section["{{#each categories:category}}"],
      );
      expectTrue(
        categoriesSection !== undefined,
        "Should have categories each loop",
      );
    },
  },
  {
    name: "createMenuPdfTemplate-has-dietary-key-section",
    description: "Template has conditional dietary key section",
    test: () => {
      const template = createMenuPdfTemplate();

      const dietarySection = template.content.find(
        (section) => section["{{#if hasDietaryKeys}}"],
      );
      expectTrue(
        dietarySection !== undefined,
        "Should have dietary keys conditional",
      );
    },
  },

  // configurePdf tests
  {
    name: "configurePdf-adds-collection",
    description: "Adds _pdfMenuData collection",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      expectTrue(
        mockConfig.collections !== undefined,
        "Should have collections",
      );
      expectFunctionType(
        mockConfig.collections,
        "_pdfMenuData",
        "Should add _pdfMenuData collection",
      );
    },
  },
  {
    name: "configurePdf-adds-event-handler",
    description: "Adds eleventy.after event handler",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      expectTrue(
        mockConfig.eventHandlers !== undefined,
        "Should have event handlers",
      );
      expectFunctionType(
        mockConfig.eventHandlers,
        "eleventy.after",
        "Should add eleventy.after handler",
      );
    },
  },
  {
    name: "configurePdf-collection-returns-empty-array",
    description: "PDF collection returns empty array (used for side effects)",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      // Create a mock collectionApi
      const mockCollectionApi = {
        getFilteredByTag: (_tag) => [],
      };

      const result = mockConfig.collections._pdfMenuData(mockCollectionApi);

      expectDeepEqual(result, [], "Collection should return empty array");
    },
  },
  {
    name: "configurePdf-collection-stores-menu-data",
    description: "Collection function retrieves and stores menu data",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      const mockMenus = [{ fileSlug: "lunch", data: { title: "Lunch" } }];
      const mockCategories = [
        { fileSlug: "apps", data: { name: "Appetizers" } },
      ];
      const mockItems = [{ data: { name: "Soup" } }];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "menu") return mockMenus;
          if (tag === "menu_category") return mockCategories;
          if (tag === "menu_item") return mockItems;
          return [];
        },
      };

      // This should store the data internally
      mockConfig.collections._pdfMenuData(mockCollectionApi);

      // The collection should return empty array
      const result = mockConfig.collections._pdfMenuData(mockCollectionApi);
      expectDeepEqual(result, [], "Collection should return empty array");
    },
  },
];

export default createTestRunner("pdf", testCases);
