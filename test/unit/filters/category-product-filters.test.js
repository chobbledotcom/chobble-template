import { describe, expect, test } from "bun:test";
import {
  categoryFilterData,
  categoryListingUI,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  filteredCategoryPages,
} from "#filters/category-product-filters.js";
import { item as baseItem, expectResultTitles } from "#test/test-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a filter attribute { name, value }
 */
const catFilterAttr = (name, value) => ({ name, value });

/**
 * Create an item with filter_attributes and categories
 * @param {string|null} title - Item title
 * @param {Object} options - { attrs: [...], categories: [...] }
 */
const catProductItem = (title, { attrs = [], categories = [] } = {}) =>
  baseItem(title, {
    ...(attrs.length > 0 ? { filter_attributes: attrs } : {}),
    ...(categories.length > 0 ? { categories } : {}),
  });

/**
 * Create a category item with a fileSlug
 */
const categoryFixture = (slug) => ({
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
  catProductItem("Product 1", { categories: [cat] });

/** Single widget product with size attribute */
const widgetWithSize = (size, title = "Widget A") =>
  catProductItem(title, {
    attrs: [catFilterAttr("Size", size)],
    categories: ["widgets"],
  });

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
  // categoryFilterData tests
  // ============================================

  describe("categoryFilterData", () => {
    test("Returns hasFilters false when category has no filter data", () => {
      const result = categoryFilterData({}, "widgets", {}, []);
      expect(result.hasFilters).toBe(false);
    });

    test("Builds UI data with category-scoped URLs", () => {
      const result = categoryFilterData(
        widgetFilterAttrs(),
        "widgets",
        {},
        widgetFilteredPages(),
      );
      expect(result.hasFilters).toBe(true);
      expect(result.clearAllUrl).toBe("/categories/widgets/#content");
      // groups[0] is sort, groups[1] is size
      expect(result.groups[0].name).toBe("sort");
      expect(result.groups[1].options[0].url).toContain("/categories/widgets/");
    });

    test("Filters pages to only include current category", () => {
      const mixedPages = [
        ...widgetFilteredPages(["size/small", "size/large"]),
        { categorySlug: "gadgets", path: "size/small" },
      ];
      const result = categoryFilterData(
        widgetFilterAttrs(["small", "large"]),
        "widgets",
        {},
        mixedPages,
        "default",
        10, // count > 1 to show filters
      );
      // groups[0] is sort (when count > 1), groups[1] is size
      const sizeGroup = result.groups.find((g) => g.name === "size");
      // Only widget pages are included, not gadgets
      expect(sizeGroup.options.length).toBe(2);
    });

    test("Hides filter groups with only 1 option", () => {
      const result = categoryFilterData(
        widgetFilterAttrs(["small"]), // Only 1 size option
        "widgets",
        {},
        widgetFilteredPages(["size/small"]),
        "default",
        10,
      );
      // Single-option groups are hidden (no meaningful choice)
      const sizeGroup = result.groups.find((g) => g.name === "size");
      expect(sizeGroup).toBeUndefined();
    });

    test("Includes active filters with remove URLs", () => {
      const result = categoryFilterData(
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

  describe("filteredCategoryPages", () => {
    test("Returns empty array when no categories exist", () => {
      const result = filteredCategoryPages(mockCollectionApi([], []));
      expect(result).toEqual([]);
    });

    test("Returns empty array for category with no filterable products", () => {
      const result = filteredCategoryPages(
        mockCollectionApi([categoryFixture("widgets")], [unfilteredProduct()]),
      );
      expect(result).toEqual([]);
    });

    test("Generates pages for each category with filterable products", () => {
      const api = mockCollectionApi(
        [categoryFixture("widgets"), categoryFixture("gadgets")],
        [
          widgetWithSize("small"),
          catProductItem("Gadget A", {
            attrs: [catFilterAttr("Color", "red")],
            categories: ["gadgets"],
          }),
        ],
      );
      const result = filteredCategoryPages(api);
      expect(
        result.filter((p) => p.categorySlug === "widgets").length,
      ).toBeGreaterThan(0);
      expect(
        result.filter((p) => p.categorySlug === "gadgets").length,
      ).toBeGreaterThan(0);
    });

    test("Filter pages include category context", () => {
      const result = filteredCategoryPages(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [widgetWithSize("small")],
        ),
      );
      const page = result[0];
      expect(page.categorySlug).toBe("widgets");
      expect(page.categoryUrl).toBe("/categories/widgets");
      expect(page.path).toBe("size/small");
      expect(page.filters).toEqual({ size: "small" });
    });

    test("Generates all valid filter combinations", () => {
      const api = mockCollectionApi(
        [categoryFixture("widgets")],
        [
          catProductItem("Small Classic", {
            attrs: [
              catFilterAttr("Size", "small"),
              catFilterAttr("Type", "classic"),
            ],
            categories: ["widgets"],
          }),
        ],
      );
      const paths = filteredCategoryPages(api).map((p) => p.path);
      expect(paths).toContain("size/small");
      expect(paths).toContain("type/classic");
      expect(paths).toContain("size/small/type/classic");
    });

    test("Filter pages include filter description with display values", () => {
      const result = filteredCategoryPages(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [
            catProductItem("Widget", {
              attrs: [catFilterAttr("Pet Friendly", "Yes")],
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
        [categoryFixture("widgets")],
        [
          widgetWithSize("small"),
          catProductItem("Gadget A", {
            attrs: [catFilterAttr("Size", "small")],
            categories: ["gadgets"],
          }),
        ],
      );
      const widgetPage = filteredCategoryPages(api).find(
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
        mockCollectionApi(
          [categoryFixture("widgets")],
          [widgetWithSize("small")],
        ),
      );
      expect(result.widgets).toBeDefined();
      expect(result.widgets.attributes.size).toEqual(["small"]);
    });

    test("Includes displayLookup for attribute keys and values", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [
            catProductItem("Widget", {
              attrs: [
                catFilterAttr("Size", "small"),
                catFilterAttr("Type", "classic"),
              ],
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
          [categoryFixture("widgets")],
          [
            widgetWithSize("small", "Widget A"),
            widgetWithSize("large", "Widget B"),
          ],
        ),
      );
      expect(result.widgets.attributes.size).toEqual(["large", "small"]);
    });

    test("Excludes categories with no filterable products", () => {
      const result = createCategoryFilterAttributes(
        mockCollectionApi(
          [categoryFixture("widgets"), categoryFixture("gadgets")],
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
        mockCollectionApi([categoryFixture("widgets")], [unfilteredProduct()]),
      );
      expect(result).toEqual([]);
    });

    test("Generates redirects with category-scoped URLs", () => {
      const result = createCategoryFilterRedirects(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [widgetWithSize("small")],
        ),
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].from).toContain("/categories/widgets/search/");
      expect(result[0].to).toContain("/categories/widgets/search/");
      expect(result.every((r) => r.from.includes("/categories/widgets/"))).toBe(
        true,
      );
    });
  });

  describe("categoryListingUI", () => {
    test("Returns empty object when no categories have filters", () => {
      const result = categoryListingUI(mockCollectionApi([], []));
      expect(result).toEqual({});
    });

    test("Returns filterUI with correct structure for category", () => {
      // Use 2 products with different sizes so filters are shown
      const result = categoryListingUI(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [
            widgetWithSize("small", "Widget A"),
            widgetWithSize("large", "Widget B"),
          ],
        ),
      );
      expect(result.widgets).toBeDefined();
      expect(result.widgets.hasFilters).toBe(true);
      expect(result.widgets.hasActiveFilters).toBe(false);
      expect(result.widgets.clearAllUrl).toBe("/categories/widgets/#content");
    });

    test("Hides filters when only 1 product in category", () => {
      const result = categoryListingUI(
        mockCollectionApi(
          [categoryFixture("widgets")],
          [widgetWithSize("small")],
        ),
      );
      // With only 1 product and 1 size option, filters are hidden
      expect(result.widgets.hasFilters).toBe(false);
    });
  });
});
