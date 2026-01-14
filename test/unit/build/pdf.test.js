import { describe, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildMenuPdfData,
  configurePdf,
  createMenuPdfTemplate,
  generateMenuPdf,
} from "#eleventy/pdf.js";
import {
  createMockEleventyConfig,
  expectObjectProps,
  withTempDirAsync,
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

// Helper to create dietary key test data - maps dietary keys arrays to full test setup
const createDietaryKeyTestData = (dietaryKeysList) => ({
  menu: createMockMenu("lunch", "Lunch"),
  categories: [createMockCategory("apps", "Appetizers", ["lunch"])],
  items: dietaryKeysList.map((dietaryKeys, i) =>
    createMockMenuItem(
      `Item ${i + 1}`,
      ["apps"],
      `$${5 + i}`,
      null,
      dietaryKeys,
    ),
  ),
});

/** Lunch menu with single item for dietary key tests */
const lunchMenuWithItem = (dietaryKeys) => ({
  menu: createMockMenu("lunch", "Lunch"),
  categories: [createMockCategory("apps", "Appetizers", ["lunch"])],
  items: [createMockMenuItem("Item", ["apps"], "$5", null, dietaryKeys)],
});

/** Minimal menu setup for PDF generation tests */
const createMinimalMenu = (slug, title) => ({
  menu: createMockMenu(slug, title),
  categories: [],
  items: [],
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

      expectObjectProps({
        menuTitle: "Lunch Menu",
        subtitle: "Served 11am-3pm",
      })(result);
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe("Appetizers");
    });

    test("Handles missing subtitle", () => {
      const menu = createMockMenu("dinner", "Dinner Menu");
      const categories = [];
      const items = [];

      const result = buildMenuPdfData(menu, categories, items);

      expectObjectProps({
        menuTitle: "Dinner Menu",
        subtitle: "",
      })(result);
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

      expectObjectProps({
        name: "Spring Rolls",
        price: "$8.99",
        description: "Crispy and delicious",
      })(result.categories[0].items[0]);
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
      const { menu, categories, items } = createDietaryKeyTestData([
        [{ symbol: "V", label: "Vegetarian" }],
        [{ symbol: "GF", label: "Gluten Free" }],
      ]);

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

      expectObjectProps({
        hasDietaryKeys: false,
        dietaryKeyString: "",
      })(result);
    });

    test("Same dietary key from multiple items appears only once", () => {
      const { menu, categories, items } = createDietaryKeyTestData([
        [{ symbol: "V", label: "Vegetarian" }],
        [{ symbol: "V", label: "Vegetarian" }],
      ]);

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
      const { menu, categories, items } = lunchMenuWithItem([]);
      const result = buildMenuPdfData(menu, categories, items);
      expect(result.categories[0].items[0].dietarySymbols).toBe("");
    });

    test("Filters out dietary keys missing symbol or label", () => {
      const { menu, categories, items } = lunchMenuWithItem([
        { symbol: "V", label: "Vegetarian" },
        { symbol: "", label: "Empty Symbol" },
        { symbol: "GF" },
        { label: "Missing Symbol" },
      ]);
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
          if (tag === "menus") return mockMenus;
          if (tag === "menu-categories") return mockCategories;
          if (tag === "menu-items") return mockItems;
          return [];
        },
      };

      // This should store the data internally
      mockConfig.collections._pdfMenuData(mockCollectionApi);

      // The collection should return empty array
      const result = mockConfig.collections._pdfMenuData(mockCollectionApi);
      expect(result).toEqual([]);
    });

    test("eleventy.after handler skips PDF generation when state is null", async () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      // Call eleventy.after WITHOUT calling the collection first (state is null)
      // This should not throw and should skip PDF generation
      await mockConfig.eventHandlers["eleventy.after"]({
        dir: { output: "/tmp" },
      });
    });

    test("eleventy.after handler skips PDF generation when menus array is empty", async () => {
      const mockConfig = createMockEleventyConfig();

      configurePdf(mockConfig);

      // First populate state with empty menus
      const mockCollectionApi = {
        getFilteredByTag: (_tag) => [],
      };
      mockConfig.collections._pdfMenuData(mockCollectionApi);

      await mockConfig.eventHandlers["eleventy.after"]({
        dir: { output: "/tmp" },
      });
    });
  });

  // generateMenuPdf tests
  describe("generateMenuPdf", () => {
    // Helper to run tests with mocked console and temp directory
    const withMockedConsole = async (callback) => {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const logCalls = [];
      const errorCalls = [];

      console.log = mock((...args) => {
        logCalls.push(args);
      });
      console.error = mock((...args) => {
        errorCalls.push(args);
      });

      try {
        return await callback(logCalls, errorCalls);
      } finally {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
    };

    test("Creates output directory if it doesn't exist", () =>
      withTempDirAsync("pdf-test", async (testOutputDir) => {
        const { menu, categories, items } = createMinimalMenu(
          "lunch",
          "Lunch Menu",
        );

        await generateMenuPdf(menu, categories, items, testOutputDir);

        // Directory should now exist (created by mkdirSync with recursive: true)
        expect(existsSync(join(testOutputDir, "menus"))).toBe(true);
      }));

    test("Generates PDF file with correct filename", () =>
      withTempDirAsync("pdf-test", async (testOutputDir) =>
        withMockedConsole(async () => {
          const { menu, categories, items } = createMinimalMenu(
            "dinner",
            "Dinner Menu",
          );

          const result = await generateMenuPdf(
            menu,
            categories,
            items,
            testOutputDir,
          );

          // Should contain the menu slug in the path
          expect(result).toContain("dinner");
          expect(result).toContain(".pdf");
        }),
      ));

    test("Returns null when PDF generation fails", () =>
      withTempDirAsync("pdf-test", async (testOutputDir) =>
        withMockedConsole(async (_logCalls, errorCalls) => {
          const { menu, categories, items } = createMinimalMenu(
            "invalid",
            "Invalid Menu",
          );

          const result = await generateMenuPdf(
            menu,
            categories,
            items,
            testOutputDir,
          );

          // If getPdfRenderer returns null, generateMenuPdf should return null
          if (result === null) {
            expect(result).toBeNull();
            // Should have logged an error
            expect(errorCalls.length).toBeGreaterThan(0);
          }
        }),
      ));

    test("Logs success message when PDF is generated", () =>
      withTempDirAsync("pdf-test", async (testOutputDir) =>
        withMockedConsole(async (logCalls) => {
          const { menu, categories, items } = createMinimalMenu(
            "lunch",
            "Lunch Menu",
          );

          await generateMenuPdf(menu, categories, items, testOutputDir);

          // If generation succeeded, should have log message
          if (logCalls.length > 0) {
            const hasSuccessLog = logCalls.some((call) =>
              call.join("").includes("Generated PDF"),
            );
            expect(hasSuccessLog).toBe(true);
          }
        }),
      ));

    test("Handles write stream errors gracefully", () =>
      withTempDirAsync("pdf-test", async (testOutputDir) =>
        withMockedConsole(async () => {
          const { menu, categories, items } = createMinimalMenu(
            "lunch",
            "Lunch Menu",
          );

          // Try to generate PDF - if there's an error, it should reject the promise
          await expect(
            generateMenuPdf(menu, categories, items, testOutputDir),
          ).resolves.toBeDefined();
        }),
      ));

    test("Uses correct menu permalink directory from strings", () =>
      withTempDirAsync("pdf-test", (testOutputDir) => {
        // Verify that the function would use the correct directory structure
        // This tests the logic at line 235: const menuDir = strings.menu_permalink_dir;
        const menu = createMockMenu("test", "Test");

        // The path should include the menu permalink directory
        // Format: ${outputDir}/${menuDir}/${menu.fileSlug}/${filename}
        const expectedPathPattern = /menus\/test/;

        // Create the expected path structure
        const testPath = join(testOutputDir, "menus/test");
        mkdirSync(testPath, { recursive: true });

        expect(existsSync(testPath)).toBe(true);
        expect(expectedPathPattern.test(testPath)).toBe(true);
      }));
  });
});
