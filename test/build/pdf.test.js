import { describe, expect, test } from "bun:test";
import {
  buildMenuPdfData,
  configurePdf,
  createMenuPdfTemplate,
} from "#eleventy/pdf.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

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

describe("pdf", () => {
  // buildMenuPdfData tests
  describe("buildMenuPdfData", () => {
    test("Builds PDF data from menu with categories and items", () => {
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

      expect(result.menuTitle).toBe("Lunch Menu");
      expect(result.subtitle).toBe("Served 11am-3pm");
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe("Appetizers");
    });

    test("Handles missing subtitle", () => {
      const menu = createMockMenu("dinner", "Dinner Menu");
      const categories = [];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expect(result.menuTitle).toBe("Dinner Menu");
      expect(result.subtitle).toBe("");
    });

    test("Only includes categories that belong to the menu", () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [
        createMockCategory("lunch-apps", "Lunch Appetizers", ["lunch"]),
        createMockCategory("dinner-apps", "Dinner Appetizers", ["dinner"]),
        createMockCategory("shared", "Shared Items", ["lunch", "dinner"]),
      ];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe("Lunch Appetizers");
      expect(result.categories[1].name).toBe("Shared Items");
    });

    test("Items are correctly filtered into their categories", () => {
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

      expect(result.categories[0].items).toHaveLength(2);
      expect(result.categories[1].items).toHaveLength(1);
    });

    test("Menu items have correct structure in PDF data", () => {
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
      expect(item.name).toBe("Spring Rolls");
      expect(item.price).toBe("$8.99");
      expect(item.description).toBe("Crispy and delicious");
    });

    test("Dietary symbols are joined correctly", () => {
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
      expect(item.dietarySymbols).toBe("V GF");
    });

    test("Builds dietary key string from all items", () => {
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

      expect(result.hasDietaryKeys).toBe(true);
      expect(result.dietaryKeyString.includes("(V) Vegetarian")).toBe(true);
      expect(result.dietaryKeyString.includes("(GF) Gluten Free")).toBe(true);
    });

    test("Handles items without dietary keys", () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Burger", ["apps"], "$12")];

      const result = buildMenuPdfData(menu, categories, items);

      expect(result.hasDietaryKeys).toBe(false);
      expect(result.dietaryKeyString).toBe("");
    });

    test("Same dietary key from multiple items appears only once", () => {
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
      expect(vCount).toBe(1);
    });

    test("HTML is stripped from category descriptions", () => {
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

      expect(result.categories[0].description).toBe("Our famous starters");
    });

    test("Handles null categories array", () => {
      const menu = createMockMenu("lunch", "Lunch");

      const result = buildMenuPdfData(menu, null, []);

      expect(result.categories).toHaveLength(0);
    });

    test("Handles null items array", () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];

      const result = buildMenuPdfData(menu, categories, null);

      expect(result.categories[0].items).toHaveLength(0);
    });

    test("Handles items without description", () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Simple Item", ["apps"], "$5", null)];

      const result = buildMenuPdfData(menu, categories, items);

      expect(result.categories[0].items[0].description).toBe("");
    });

    test("Handles empty dietary keys array", () => {
      const menu = createMockMenu("lunch", "Lunch");
      const categories = [createMockCategory("apps", "Appetizers", ["lunch"])];
      const items = [createMockMenuItem("Item", ["apps"], "$5", null, [])];

      const result = buildMenuPdfData(menu, categories, items);

      expect(result.categories[0].items[0].dietarySymbols).toBe("");
    });

    test("Filters out dietary keys missing symbol or label", () => {
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

      expect(result.dietaryKeyString).toBe("(V) Vegetarian");
    });
  });

  // createMenuPdfTemplate tests
  describe("createMenuPdfTemplate", () => {
    test("Returns a valid PDF template object", () => {
      const template = createMenuPdfTemplate();

      expect(typeof template).toBe("object");
      expect(template.pageSize).toBe("A4");
    });

    test("Template has page margins defined", () => {
      const template = createMenuPdfTemplate();

      expect(template.pageMargins).toEqual([40, 40, 40, 40]);
    });

    test("Template has content array with required sections", () => {
      const template = createMenuPdfTemplate();

      expect(Array.isArray(template.content)).toBe(true);
      expect(template.content.length > 0).toBe(true);
    });

    test("Template includes business name placeholder", () => {
      const template = createMenuPdfTemplate();

      const businessNameSection = template.content.find(
        (section) => section.text === "{{businessName}}",
      );
      expect(businessNameSection !== undefined).toBe(true);
      expect(businessNameSection.style).toBe("businessName");
    });

    test("Template includes menu title placeholder", () => {
      const template = createMenuPdfTemplate();

      const menuTitleSection = template.content.find(
        (section) => section.text === "{{menuTitle}}",
      );
      expect(menuTitleSection !== undefined).toBe(true);
      expect(menuTitleSection.style).toBe("menuTitle");
    });

    test("Template has all required styles defined", () => {
      const template = createMenuPdfTemplate();

      expect(template.styles !== undefined).toBe(true);
      expect(template.styles.businessName !== undefined).toBe(true);
      expect(template.styles.menuTitle !== undefined).toBe(true);
      expect(template.styles.categoryHeader !== undefined).toBe(true);
      expect(template.styles.itemName !== undefined).toBe(true);
      expect(template.styles.price !== undefined).toBe(true);
    });

    test("Styles have appropriate font sizes", () => {
      const template = createMenuPdfTemplate();

      expect(template.styles.businessName.fontSize).toBe(24);
      expect(template.styles.menuTitle.fontSize).toBe(18);
      expect(template.styles.categoryHeader.fontSize).toBe(16);
      expect(template.styles.itemName.fontSize).toBe(11);
    });

    test("Template uses Helvetica as default font", () => {
      const template = createMenuPdfTemplate();

      expect(template.defaultStyle.font).toBe("Helvetica");
    });

    test("Template has categories loop structure", () => {
      const template = createMenuPdfTemplate();

      const categoriesSection = template.content.find(
        (section) => section["{{#each categories:category}}"],
      );
      expect(categoriesSection !== undefined).toBe(true);
    });

    test("Template has conditional dietary key section", () => {
      const template = createMenuPdfTemplate();

      const dietarySection = template.content.find(
        (section) => section["{{#if hasDietaryKeys}}"],
      );
      expect(dietarySection !== undefined).toBe(true);
    });
  });

  // configurePdf tests
  describe("configurePdf", () => {
    test("Adds _pdfMenuData collection", () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      expect(mockConfig.collections !== undefined).toBe(true);
      expect(typeof mockConfig.collections._pdfMenuData).toBe("function");
    });

    test("Adds eleventy.after event handler", () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      expect(mockConfig.eventHandlers !== undefined).toBe(true);
      expect(typeof mockConfig.eventHandlers["eleventy.after"]).toBe(
        "function",
      );
    });

    test("PDF collection returns empty array (used for side effects)", () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      // Create a mock collectionApi
      const mockCollectionApi = {
        getFilteredByTag: (_tag) => [],
      };

      const result = mockConfig.collections._pdfMenuData(mockCollectionApi);

      expect(result).toEqual([]);
    });

    test("Collection function retrieves and stores menu data", () => {
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
      expect(result).toEqual([]);
    });
  });
});
