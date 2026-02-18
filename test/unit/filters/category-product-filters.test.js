import { describe, expect, test } from "bun:test";
import {
  categoryFilterData,
  categoryListingUI,
  createCategoryFilterAttributes,
} from "#filters/category-product-filters.js";
import { item as baseItem } from "#test/test-utils.js";

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
      expect(result.clearAllUrl).toBe("/categories/widgets");
      // groups[0] is sort, groups[1] is size
      expect(result.groups[0].name).toBe("sort");
      expect(result.groups[1].options[0].url).toContain("/categories/widgets#");
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
      expect(result.activeFilters[0].removeUrl).toBe("/categories/widgets");
    });
  });

  // ============================================
  // createCategoryFilterAttributes tests
  // ============================================

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
          [
            widgetWithSize("small"),
            catProductItem("Product 1", { categories: ["gadgets"] }),
          ],
        ),
      );
      expect(result.widgets).toBeDefined();
      expect(result.gadgets).toBeUndefined();
    });
  });

  // ============================================
  // categoryListingUI tests
  // ============================================

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
      expect(result.widgets.clearAllUrl).toBe("/categories/widgets");
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
