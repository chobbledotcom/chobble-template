import { describe, expect, test } from "bun:test";
import { configureCategories } from "#collections/categories.js";
import {
  createMockEleventyConfig,
  expectDataArray,
  taggedCollectionApi,
} from "#test/test-utils.js";

import { map } from "#toolkit/fp/array.js";

const expectHeaderImages = expectDataArray("header_image");

// ============================================
// Test Fixture Builders
// ============================================

/**
 * Create a category with fileSlug and data
 */
const category = (slug, headerImage, extraData = {}) => ({
  fileSlug: slug,
  data: {
    ...(headerImage !== undefined && { header_image: headerImage }),
    ...extraData,
  },
});

/**
 * Create categories from an array of [slug, headerImage, extraData] tuples
 */
const categories = map(([slug, headerImage, extraData]) =>
  category(slug, headerImage, extraData),
);

/**
 * Create a product for category image tests
 */
const product = ({ order, cats = [], headerImage, ...extraData } = {}) => ({
  data: {
    ...(order !== undefined && { order }),
    categories: cats,
    ...(headerImage && { header_image: headerImage }),
    ...extraData,
  },
});

/**
 * Create products from an array of option objects
 */
const products = map(product);

/**
 * Helper to get the categories collection from a configured mock
 */
const getCategoriesCollection = (categoryData, productData) => {
  const mockConfig = createMockEleventyConfig();
  configureCategories(mockConfig);

  const mockApi = taggedCollectionApi({
    categories: categoryData,
    products: productData,
  });

  return mockConfig.collections.categories(mockApi);
};

describe("categories", () => {
  describe("configureCategories", () => {
    test("registers collection with Eleventy", () => {
      const mockConfig = createMockEleventyConfig();

      configureCategories(mockConfig);

      expect(typeof mockConfig.collections.categories).toBe("function");
    });
  });

  describe("categories collection", () => {
    test("returns empty array when no categories exist", () => {
      const result = getCategoriesCollection([], []);

      expect(result).toEqual([]);
    });

    test("returns categories with their own header images when no products", () => {
      const testCategories = categories([
        ["widgets", "widget-header.jpg", { title: "Widgets" }],
        ["gadgets", "gadget-header.jpg", { title: "Gadgets" }],
      ]);

      const result = getCategoriesCollection(testCategories, []);

      expectHeaderImages(result, ["widget-header.jpg", "gadget-header.jpg"]);
    });

    test("inherits header image from highest-order product in category", () => {
      const testCategories = categories([
        ["widgets", "default-widget.jpg", { title: "Widgets" }],
      ]);
      const testProducts = products([
        { order: 2, cats: ["widgets"], headerImage: "low-priority.jpg" },
        { order: 5, cats: ["widgets"], headerImage: "high-priority.jpg" },
        { order: 3, cats: ["widgets"], headerImage: "mid-priority.jpg" },
      ]);

      const result = getCategoriesCollection(testCategories, testProducts);

      expectHeaderImages(result, ["high-priority.jpg"]);
    });

    test("uses category default when products have no header images", () => {
      const testCategories = [
        category("widgets", "widget-header.jpg", { title: "Widgets" }),
      ];
      const testProducts = [product({ order: 10, cats: ["widgets"] })];

      const result = getCategoriesCollection(testCategories, testProducts);

      expectHeaderImages(result, ["widget-header.jpg"]);
    });

    test("product with order 0 (default) can override category image", () => {
      const testCategories = [category("widgets", "widget-header.jpg")];
      const testProducts = [
        product({ cats: ["widgets"], headerImage: "product-image.jpg" }),
      ];

      const result = getCategoriesCollection(testCategories, testProducts);

      expectHeaderImages(result, ["product-image.jpg"]);
    });

    test("handles products in multiple categories", () => {
      const testCategories = categories([
        ["widgets", "widget-default.jpg"],
        ["gadgets", "gadget-default.jpg"],
      ]);
      const testProducts = [
        product({
          order: 5,
          cats: ["widgets", "gadgets"],
          headerImage: "shared-image.jpg",
        }),
      ];

      const result = getCategoriesCollection(testCategories, testProducts);

      expectHeaderImages(result, ["shared-image.jpg", "shared-image.jpg"]);
    });

    test("ignores products without categories", () => {
      const testCategories = [category("widgets", "widget-header.jpg")];
      const testProducts = [
        product({ order: 10, headerImage: "orphan-image.jpg" }),
      ];

      const result = getCategoriesCollection(testCategories, testProducts);

      expectHeaderImages(result, ["widget-header.jpg"]);
    });

    test("preserves category data properties", () => {
      const testCategories = categories([
        ["widgets", undefined, { title: "Widgets", featured: true }],
      ]);
      const testProducts = products([
        { order: 5, cats: ["widgets"], headerImage: "product.jpg" },
      ]);

      const result = getCategoriesCollection(testCategories, testProducts);

      expect(result[0].data.title).toBe("Widgets");
      expect(result[0].data.featured).toBe(true);
      expect(result[0].data.header_image).toBe("product.jpg");
    });

    test("handles complex scenario with multiple categories and products", () => {
      const testCategories = categories([
        ["widgets", "widget-default.jpg"],
        ["gadgets", "gadget-default.jpg"],
        ["tools", undefined],
      ]);
      const testProducts = products([
        {
          order: 3,
          cats: ["widgets", "gadgets"],
          headerImage: "cross-category.jpg",
        },
        { order: 1, cats: ["widgets"], headerImage: "low-priority-widget.jpg" },
        { order: 5, cats: ["tools"], headerImage: "high-priority-tool.jpg" },
        { cats: ["gadgets"], headerImage: "default-order-gadget.jpg" },
      ]);

      const result = getCategoriesCollection(testCategories, testProducts);

      // widgets: order 3 > order 1, so cross-category wins
      // gadgets: order 3 > order 0, so cross-category wins
      // tools: order 5 is highest
      expectHeaderImages(result, [
        "cross-category.jpg",
        "cross-category.jpg",
        "high-priority-tool.jpg",
      ]);
    });
  });

  describe("parent category thumbnail inheritance", () => {
    test("parent category inherits thumbnail from child with lowest order", () => {
      const testCategories = [
        category("widgets", undefined, { title: "Widgets" }),
        category("premium-widgets", undefined, {
          title: "Premium Widgets",
          parent: "widgets",
          order: 1,
        }),
        category("budget-widgets", undefined, {
          title: "Budget Widgets",
          parent: "widgets",
          order: 2,
        }),
      ];
      const testProducts = products([
        { cats: ["premium-widgets"], thumbnail: "premium-thumb.jpg" },
        { cats: ["budget-widgets"], thumbnail: "budget-thumb.jpg" },
      ]);

      const result = getCategoriesCollection(testCategories, testProducts);

      // Parent should get thumbnail from child with lowest order (premium)
      expect(result[0].data.thumbnail).toBe("premium-thumb.jpg");
    });

    test("parent category uses own thumbnail when set", () => {
      const testCategories = [
        category("widgets", undefined, {
          title: "Widgets",
          thumbnail: "widgets-thumb.jpg",
        }),
        category("premium-widgets", undefined, {
          title: "Premium Widgets",
          parent: "widgets",
        }),
      ];
      const testProducts = products([
        { cats: ["premium-widgets"], thumbnail: "premium-thumb.jpg" },
      ]);

      const result = getCategoriesCollection(testCategories, testProducts);

      // Parent keeps its own thumbnail
      expect(result[0].data.thumbnail).toBe("widgets-thumb.jpg");
    });

    test("parent category gets no thumbnail when children have none", () => {
      const testCategories = [
        category("widgets", undefined, { title: "Widgets" }),
        category("premium-widgets", undefined, {
          title: "Premium Widgets",
          parent: "widgets",
        }),
      ];

      const result = getCategoriesCollection(testCategories, []);

      expect(result[0].data.thumbnail).toBeUndefined();
    });
  });
});
