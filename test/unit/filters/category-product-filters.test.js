import { describe, expect, test } from "bun:test";
import {
  buildCategoryFilterUIDataFn,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  createCategoryListingFilterUI,
  createFilteredCategoryProductPages,
} from "#filters/category-product-filters.js";
import { item as baseItem, expectResultTitles } from "#test/test-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a filter attribute { name, value }
 */
const attr = (name, value) => ({ name, value });

/**
 * Create an item with filter_attributes and categories
 * @param {string|null} title - Item title
 * @param {Object} options - { attrs: [...], categories: [...] }
 */
const item = (title, { attrs = [], categories = [] } = {}) =>
  baseItem(title, {
    ...(attrs.length > 0 ? { filter_attributes: attrs } : {}),
    ...(categories.length > 0 ? { categories } : {}),
  });

/**
 * Create a category item with a fileSlug
 */
const category = (slug) => ({
  fileSlug: slug,
  data: {},
});

/**
 * Create a mock collection API that returns tagged items
 */
const mockCollectionApi = (categories, products) => ({
  getFilteredByTag: (tag) => {
    if (tag === "categories") return categories;
    if (tag === "products") return products;
    return [];
  },
});

// ============================================
// Shared Test Fixtures
// ============================================

/** Product with no filter attributes */
const unfilteredProduct = (cat = "widgets") =>
  item("Product 1", { categories: [cat] });

/** Single widget product with size attribute */
const widgetWithSize = (size, title = "Widget A") =>
  item(title, { attrs: [attr("Size", size)], categories: ["widgets"] });

/** Standard widget filter UI attributes */
const widgetFilterAttrs = (sizes = ["small", "large"]) => ({
  widgets: {
    attributes: { size: sizes },
    displayLookup: { size: "Size", small: "Small", large: "Large" },
  },
});

/** Standard filtered pages for widgets */
const widgetFilteredPages = (paths = ["size/small", "size/large"]) =>
  paths.map((path) => ({ categorySlug: "widgets", path }));

describe("category-product-filters", () => {
  // ============================================
  // buildCategoryFilterUIDataFn tests
  // ============================================

  describe("buildCategoryFilterUIDataFn", () => {
    test("Returns hasFilters false when category has no filter data", () => {
      const result = buildCategoryFilterUIDataFn({}, "widgets", null, []);
      expect(result.hasFilters).toBe(false);
    });

    test("Builds UI data with category-scoped URLs", () => {
      const result = buildCategoryFilterUIDataFn(
        widgetFilterAttrs(),
        "widgets",
        null,
        widgetFilteredPages(),
      );
      expect(result.hasFilters).toBe(true);
      expect(result.clearAllUrl).toBe("/categories/widgets/#content");
      expect(result.groups[0].options[0].url).toContain("/categories/widgets/");
    });

    test("Filters pages to only include current category", () => {
      const mixedPages = [
        ...widgetFilteredPages(["size/small"]),
        { categorySlug: "gadgets", path: "size/small" },
      ];
      const result = buildCategoryFilterUIDataFn(
        widgetFilterAttrs(["small"]),
        "widgets",
        null,
        mixedPages,
      );
      expect(result.groups[0].options.length).toBe(1);
    });

    test("Includes active filters with remove URLs", () => {
      const result = buildCategoryFilterUIDataFn(
        widgetFilterAttrs(),
        "widgets",
        { size: "small" },
        widgetFilteredPages(),
      );
      expect(result.hasActiveFilters).toBe(true);
      expect(result.activeFilters[0].key).toBe("Size");
      expect(result.activeFilters[0].removeUrl).toBe(
        "/categories/widgets/#content",
      );
    });
  });

  // ============================================
  // Collection creation tests
  // ============================================

  describe("createFilteredCategoryProductPages", () => {
    test("Returns empty array when no categories exist", () => {
      const result = createFilteredCategoryProductPages(
        mockCollectionApi([], []),
      );
      expect(result).toEqual([]);
    });

    test("Returns empty array for category with no filterable products", () => {
      const result = createFilteredCategoryProductPages(
        mockCollectionApi([category("widgets")], [unfilteredProduct()]),
      );
      expect(result).toEqual([]);
    });

    test("Generates pages for each category with filterable products", () => {
      const api = mockCollectionApi(
        [category("widgets"), category("gadgets")],
        [
          widgetWithSize("small"),
          item("Gadget A", {
            attrs: [attr("Color", "red")],
            categories: ["gadgets"],
          }),
        ],
      );
      const result = createFilteredCategoryProductPages(api);
      expect(
        result.filter((p) => p.categorySlug === "widgets").length,
      ).toBeGreaterThan(0);
      expect(
        result.filter((p) => p.categorySlug === "gadgets").length,
      ).toBeGreaterThan(0);
    });

    test("Filter pages include category context", () => {
      const result = createFilteredCategoryProductPages(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      const page = result[0];
      expect(page.categorySlug).toBe("widgets");
      expect(page.categoryUrl).toBe("/categories/widgets");
      expect(page.path).toBe("size/small");
      expect(page.filters).toEqual({ size: "small" });
    });

    test("Generates all valid filter combinations", () => {
      const api = mockCollectionApi(
        [category("widgets")],
        [
          item("Small Classic", {
            attrs: [attr("Size", "small"), attr("Type", "classic")],
            categories: ["widgets"],
          }),
        ],
      );
      const paths = createFilteredCategoryProductPages(api).map((p) => p.path);
      expect(paths).toContain("size/small");
      expect(paths).toContain("type/classic");
      expect(paths).toContain("size/small/type/classic");
    });

    test("Filter pages include filter description with display values", () => {
      const result = createFilteredCategoryProductPages(
        mockCollectionApi(
          [category("widgets")],
          [
            item("Widget", {
              attrs: [attr("Pet Friendly", "Yes")],
              categories: ["widgets"],
            }),
          ],
        ),
      );
      expect(result[0].filterDescription).toEqual([
        { key: "Pet Friendly", value: "Yes" },
      ]);
    });

    test("Only includes products belonging to each category", () => {
      const api = mockCollectionApi(
        [category("widgets")],
        [
          widgetWithSize("small"),
          item("Gadget A", {
            attrs: [attr("Size", "small")],
            categories: ["gadgets"],
          }),
        ],
      );
      const widgetPage = createFilteredCategoryProductPages(api).find(
        (p) => p.path === "size/small",
      );
      expectResultTitles(widgetPage.products, ["Widget A"]);
    });
  });

  describe("createCategoryFilterAttributes", () => {
    test("Returns empty object when no categories exist", () => {
      expect(createCategoryFilterAttributes(mockCollectionApi([], []))).toEqual(
        {},
      );
    });

    test("Returns attributes keyed by category slug", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      expect(result.widgets).toBeDefined();
      expect(result.widgets.attributes.size).toEqual(["small"]);
    });

    test("Includes displayLookup for attribute keys and values", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi(
          [category("widgets")],
          [
            item("Widget", {
              attrs: [attr("Size", "small"), attr("Type", "classic")],
              categories: ["widgets"],
            }),
          ],
        ),
      );
      expect(result.widgets.displayLookup.size).toBe("Size");
      expect(result.widgets.displayLookup.type).toBe("Type");
      expect(result.widgets.displayLookup.small).toBe("small");
    });

    test("Collects attributes from multiple products", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi(
          [category("widgets")],
          [widgetWithSize("small", "Widget A"), widgetWithSize("large", "Widget B")],
        ),
      );
      expect(result.widgets.attributes.size).toEqual(["large", "small"]);
    });

    test("Excludes categories with no filterable products", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi(
          [category("widgets"), category("gadgets")],
          [widgetWithSize("small"), unfilteredProduct("gadgets")],
        ),
      );
      expect(result.widgets).toBeDefined();
      expect(result.gadgets).toBeUndefined();
    });
  });

  describe("createCategoryFilterRedirects", () => {
    test("Returns empty array when no categories exist", () => {
      expect(createCategoryFilterRedirects(mockCollectionApi([], []))).toEqual(
        [],
      );
    });

    test("Returns empty array for category with no filterable products", () => {
      const result = createCategoryFilterRedirects(
        mockCollectionApi([category("widgets")], [unfilteredProduct()]),
      );
      expect(result).toEqual([]);
    });

    test("Generates redirects with category-scoped URLs", () => {
      const result = createCategoryFilterRedirects(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].from).toContain("/categories/widgets/search/");
      expect(result[0].to).toContain("/categories/widgets/search/");
      expect(result.every((r) => r.from.includes("/categories/widgets/"))).toBe(
        true,
      );
    });
  });

  describe("createCategoryListingFilterUI", () => {
    test("Returns empty object when no categories have filters", () => {
      const result = createCategoryListingFilterUI(mockCollectionApi([], []));
      expect(result).toEqual({});
    });

    test("Returns filterUI keyed by category slug", () => {
      const result = createCategoryListingFilterUI(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      expect(result.widgets).toBeDefined();
      expect(result.widgets.hasFilters).toBe(true);
    });

    test("FilterUI has no active filters for listing pages", () => {
      const result = createCategoryListingFilterUI(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      expect(result.widgets.hasActiveFilters).toBe(false);
    });

    test("FilterUI includes category-scoped URLs", () => {
      const result = createCategoryListingFilterUI(
        mockCollectionApi([category("widgets")], [widgetWithSize("small")]),
      );
      expect(result.widgets.clearAllUrl).toBe("/categories/widgets/#content");
    });
  });
});
