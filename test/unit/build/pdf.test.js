import { describe, expect, test } from "bun:test";
import siteData from "#data/site.json" with { type: "json" };
import strings from "#data/strings.js";
import { buildMenuPdfData, configurePdf } from "#eleventy/pdf.js";
import {
  createMockEleventyConfig,
  expectObjectProps,
  fs,
  path,
  taggedCollectionApi,
  withTempDirAsync,
} from "#test/test-utils.js";

const menu = ({
  fileSlug = "lunch",
  title = "Lunch",
  subtitle = null,
} = {}) => ({
  fileSlug,
  data: { title, subtitle },
});

const category = ({
  fileSlug = "category",
  name = "Category",
  menus = ["lunch"],
  order = 0,
  templateContent = null,
} = {}) => ({
  fileSlug,
  data: { name, menus, order },
  templateContent,
});

const menuItem = ({
  name = "Item",
  menu_categories = [],
  price = "$5",
  description = null,
  dietaryKeys = [],
} = {}) => ({
  data: { name, menu_categories, price, description, dietaryKeys },
});

const state = (menuCategories = [], menuItems = []) => ({
  menuCategories,
  menuItems,
});

const menusOutputDir = (root) => path.join(root, strings.menus_permalink_dir);

const APPS_SLUG = "apps";

const VEG_AND_GF = [
  { symbol: "V", label: "Vegetarian" },
  { symbol: "GF", label: "Gluten Free" },
];

const buildAppsPdf = (...itemOverrides) =>
  buildMenuPdfData(
    menu(),
    state(
      [category({ fileSlug: APPS_SLUG })],
      itemOverrides.map((overrides) =>
        menuItem({ menu_categories: [APPS_SLUG], ...overrides }),
      ),
    ),
  );

const configuredPdf = () => {
  const cfg = createMockEleventyConfig();
  configurePdf(cfg);
  return cfg;
};

const runAfter = (cfg, outputDir) =>
  cfg.eventHandlers["eleventy.after"]({ dir: { output: outputDir } });

describe("pdf", () => {
  describe("buildMenuPdfData", () => {
    test("includes business name from site config", () => {
      const result = buildMenuPdfData(menu(), state());
      expect(result.businessName).toBe(siteData.name);
    });

    test("uses menu title and subtitle from menu data", () => {
      const result = buildMenuPdfData(
        menu({ title: "Lunch", subtitle: "Served 11-3" }),
        state(),
      );
      expectObjectProps({
        menuTitle: "Lunch",
        subtitle: "Served 11-3",
      })(result);
    });

    test("subtitle is null when menu has no subtitle", () => {
      const result = buildMenuPdfData(menu({ subtitle: null }), state());
      expect(result.subtitle).toBeNull();
    });

    test("includes only categories that list this menu in their menus array", () => {
      const result = buildMenuPdfData(
        menu({ fileSlug: "lunch" }),
        state([
          category({ fileSlug: "a", name: "Lunch A", menus: ["lunch"] }),
          category({ fileSlug: "b", name: "Dinner B", menus: ["dinner"] }),
          category({
            fileSlug: "c",
            name: "Shared",
            menus: ["lunch", "dinner"],
          }),
        ]),
      );
      expect(result.categories.map((c) => c.name)).toEqual([
        "Lunch A",
        "Shared",
      ]);
    });

    test("returns categories sorted by their order field", () => {
      const result = buildMenuPdfData(
        menu(),
        state([
          category({ fileSlug: "z", name: "Last", order: 30 }),
          category({ fileSlug: "a", name: "First", order: 10 }),
          category({ fileSlug: "m", name: "Middle", order: 20 }),
        ]),
      );
      expect(result.categories.map((c) => c.name)).toEqual([
        "First",
        "Middle",
        "Last",
      ]);
    });

    test("places items into the categories listed in menu_categories", () => {
      const result = buildMenuPdfData(
        menu(),
        state(
          [
            category({ fileSlug: "apps", name: "Apps" }),
            category({ fileSlug: "mains", name: "Mains" }),
          ],
          [
            menuItem({ name: "Soup", menu_categories: ["apps"] }),
            menuItem({ name: "Salad", menu_categories: ["apps"] }),
            menuItem({ name: "Burger", menu_categories: ["mains"] }),
          ],
        ),
      );
      expect(result.categories[0].items.map((i) => i.name)).toEqual([
        "Soup",
        "Salad",
      ]);
      expect(result.categories[1].items.map((i) => i.name)).toEqual(["Burger"]);
    });

    test("ignores items whose category is not on this menu", () => {
      const result = buildAppsPdf(
        { name: "Foreign", menu_categories: ["desserts"] },
        { name: "Local" },
      );
      expect(result.categories[0].items.map((i) => i.name)).toEqual(["Local"]);
    });

    test("preserves item name, price and description", () => {
      const result = buildAppsPdf({
        name: "Spring Rolls",
        price: "$8.99",
        description: "Crispy and fresh",
      });
      expectObjectProps({
        name: "Spring Rolls",
        price: "$8.99",
        description: "Crispy and fresh",
      })(result.categories[0].items[0]);
    });

    test("preserves a null item description", () => {
      const result = buildAppsPdf({ description: null });
      expect(result.categories[0].items[0].description).toBeNull();
    });

    test("joins multiple dietary symbols with a single space", () => {
      const result = buildAppsPdf({ dietaryKeys: VEG_AND_GF });
      expect(result.categories[0].items[0].dietarySymbols).toBe("V GF");
    });

    test("dietary symbols string is empty when item has no keys", () => {
      const result = buildAppsPdf({ dietaryKeys: [] });
      expect(result.categories[0].items[0].dietarySymbols).toBe("");
    });

    test("formats dietary key string as '(symbol) label' joined by ', '", () => {
      const result = buildAppsPdf({ dietaryKeys: VEG_AND_GF });
      expect(result.dietaryKeyString).toBe("(V) Vegetarian, (GF) Gluten Free");
      expect(result.hasDietaryKeys).toBe(true);
    });

    test("hasDietaryKeys is false and string is empty when no keys present", () => {
      const result = buildAppsPdf({});
      expectObjectProps({
        hasDietaryKeys: false,
        dietaryKeyString: "",
      })(result);
    });

    test("deduplicates the dietary key string by symbol across items", () => {
      const result = buildAppsPdf(
        { dietaryKeys: [{ symbol: "V", label: "Vegetarian" }] },
        { dietaryKeys: [{ symbol: "V", label: "Vegetarian" }] },
      );
      expect(result.dietaryKeyString).toBe("(V) Vegetarian");
    });

    test("excludes dietary keys missing either symbol or label", () => {
      const result = buildAppsPdf({
        dietaryKeys: [
          { symbol: "V", label: "Vegetarian" },
          { symbol: "", label: "Empty Symbol" },
          { symbol: "GF" },
          { label: "Missing Symbol" },
        ],
      });
      expect(result.dietaryKeyString).toBe("(V) Vegetarian");
    });

    test("strips HTML tags from category template content for description", () => {
      const result = buildMenuPdfData(
        menu(),
        state([
          category({
            fileSlug: "apps",
            templateContent: "<p>Our <strong>famous</strong> starters</p>",
          }),
        ]),
      );
      expect(result.categories[0].description).toBe("Our famous starters");
    });

    test("category description is empty when template content is missing", () => {
      const result = buildMenuPdfData(
        menu(),
        state([category({ fileSlug: "apps", templateContent: null })]),
      );
      expect(result.categories[0].description).toBe("");
    });
  });

  describe("configurePdf", () => {
    test("collection callback returns empty array (used only for state capture)", () => {
      const cfg = configuredPdf();

      const result = cfg.collections._pdfMenuData(taggedCollectionApi({}));

      expect(result).toEqual([]);
    });

    test("after handler creates no PDF output when collection never ran", () =>
      withTempDirAsync("pdf-no-state", async (tempDir) => {
        await runAfter(configuredPdf(), tempDir);
        expect(fs.existsSync(menusOutputDir(tempDir))).toBe(false);
      }));

    test("after handler creates no PDF output when collection had no menus", () =>
      withTempDirAsync("pdf-empty-state", async (tempDir) => {
        const cfg = configuredPdf();
        cfg.collections._pdfMenuData(taggedCollectionApi({}));
        await runAfter(cfg, tempDir);
        expect(fs.existsSync(menusOutputDir(tempDir))).toBe(false);
      }));
  });
});
