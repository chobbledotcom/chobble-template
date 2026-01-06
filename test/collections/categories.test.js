import { describe, expect, test } from "bun:test";
import {
  assignCategoryImages,
  buildCategoryImageMap,
  configureCategories,
  createCategoriesCollection,
  getFeaturedCategories,
} from "#collections/categories.js";
import {
  createMockEleventyConfig,
  expectDataArray,
  expectResultTitles,
  taggedCollectionApi,
} from "#test/test-utils.js";

import { map } from "#utils/array-utils.js";

const expectHeaderImages = expectDataArray("header_image");

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a category with fileSlug and data
 * @param {string} slug - The fileSlug
 * @param {string|null} headerImage - The header_image (null/undefined to omit)
 * @param {Object} extraData - Additional data properties
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
 * Curried for use with pipe
 */
const categories = map(([slug, headerImage, extraData]) =>
  category(slug, headerImage, extraData),
);

/**
 * Create a product for category image tests
 * @param {Object} options - Product options
 */
const product = ({ order, cats = [], headerImage, ...extraData } = {}) => ({
  data: {
    ...(order !== undefined && { order }),
    ...(cats.length > 0 && { categories: cats }),
    ...(headerImage && { header_image: headerImage }),
    ...extraData,
  },
});

/**
 * Create products from an array of option objects
 * Curried for use with pipe
 */
const products = map(product);

describe("categories", () => {
  test("buildCategoryImageMap-empty-data", () => {
    const result = buildCategoryImageMap([], []);

    expect(result).toEqual({});
  });

  test("buildCategoryImageMap-categories-only", () => {
    const testCategories = categories([
      ["widgets", "widget-header.jpg"],
      ["gadgets", "gadget-header.jpg"],
    ]);

    const result = buildCategoryImageMap(testCategories, []);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
      gadgets: ["gadget-header.jpg", -1],
    });
  });

  test("buildCategoryImageMap-no-category-images", () => {
    const testCategories = [
      category("widgets", undefined),
      category("gadgets", null),
    ];

    const result = buildCategoryImageMap(testCategories, []);

    expect(result).toEqual({
      widgets: [undefined, -1],
      gadgets: [null, -1],
    });
  });

  test("buildCategoryImageMap-product-override", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = [
      product({
        order: 5,
        cats: ["widgets"],
        headerImage: "product-image.jpg",
      }),
    ];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-product-no-override", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = products([
      { order: 2, cats: ["widgets"], headerImage: "low-priority.jpg" },
      { order: 5, cats: ["widgets"], headerImage: "high-priority.jpg" },
    ]);

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["high-priority.jpg", 5],
    });
  });

  test("buildCategoryImageMap-default-order", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = [
      product({ cats: ["widgets"], headerImage: "product-image.jpg" }),
    ];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 0],
    });
  });

  test("buildCategoryImageMap-multiple-categories", () => {
    const testCategories = categories([
      ["widgets", "widget-header.jpg"],
      ["gadgets", "gadget-header.jpg"],
    ]);
    const testProducts = [
      product({
        order: 3,
        cats: ["widgets", "gadgets"],
        headerImage: "multi-category.jpg",
      }),
    ];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["multi-category.jpg", 3],
      gadgets: ["multi-category.jpg", 3],
    });
  });

  test("buildCategoryImageMap-no-product-image", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = [product({ order: 10, cats: ["widgets"] })];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
    });
  });

  test("assignCategoryImages-basic", () => {
    const testCategories = categories([
      ["widgets", undefined, { title: "Widgets" }],
      ["gadgets", undefined, { title: "Gadgets" }],
    ]);
    const categoryImages = {
      widgets: ["widget-final.jpg", 5],
      gadgets: ["gadget-final.jpg", 3],
    };

    const result = assignCategoryImages(testCategories, categoryImages);

    expectHeaderImages(result, ["widget-final.jpg", "gadget-final.jpg"]);
    expect(result[0].data.title).toBe("Widgets");
  });

  test("assignCategoryImages-missing-mapping", () => {
    const testCategories = [
      category("widgets", undefined, { title: "Widgets" }),
    ];
    const categoryImages = {};

    const result = assignCategoryImages(testCategories, categoryImages);

    expectHeaderImages(result, [undefined]);
  });

  test("assignCategoryImages-mutates-original", () => {
    const testCategories = [
      category("widgets", undefined, { title: "Widgets" }),
    ];
    const categoryImages = { widgets: ["widget.jpg", 1] };

    const result = assignCategoryImages(testCategories, categoryImages);

    expect(result[0]).toBe(testCategories[0]);
    expect(testCategories[0].data.header_image).toBe("widget.jpg");
  });

  test("createCategoriesCollection-empty", () => {
    const mockApi = taggedCollectionApi({ category: [], product: [] });

    const result = createCategoriesCollection(mockApi);

    expect(result).toEqual([]);
  });

  test("createCategoriesCollection-integration", () => {
    const mockApi = taggedCollectionApi({
      category: categories([
        ["widgets", "default-widget.jpg", { title: "Widgets" }],
        ["gadgets", undefined, { title: "Gadgets" }],
      ]),
      product: products([
        { order: 5, cats: ["widgets"], headerImage: "premium-widget.jpg" },
        { order: 2, cats: ["gadgets"], headerImage: "basic-gadget.jpg" },
      ]),
    });

    const result = createCategoriesCollection(mockApi);

    expectHeaderImages(result, ["premium-widget.jpg", "basic-gadget.jpg"]);
    expect(result[0].data.title).toBe("Widgets");
  });

  test("getFeaturedCategories-basic", () => {
    const testCategories = categories([
      ["featured", undefined, { title: "Featured Category", featured: true }],
      ["regular", undefined, { title: "Regular Category", featured: false }],
      ["another", undefined, { title: "Another Category" }],
    ]);

    const result = getFeaturedCategories(testCategories);

    expectResultTitles(result, ["Featured Category"]);
  });

  test("getFeaturedCategories-null-safe", () => {
    expect(getFeaturedCategories(null)).toEqual([]);
    expect(getFeaturedCategories(undefined)).toEqual([]);
  });

  test("configureCategories-basic", () => {
    const mockConfig = createMockEleventyConfig();

    configureCategories(mockConfig);

    expect(mockConfig.collections.categories).toBeTruthy();
    expect(typeof mockConfig.collections.categories).toBe("function");
    expect(mockConfig.collections.categories).toBe(createCategoriesCollection);

    expect(mockConfig.filters.getFeaturedCategories).toBeTruthy();
    expect(typeof mockConfig.filters.getFeaturedCategories).toBe("function");
    expect(mockConfig.filters.getFeaturedCategories).toBe(
      getFeaturedCategories,
    );
  });

  test("buildCategoryImageMap-order-precedence", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = products([
      { order: 5, cats: ["widgets"], headerImage: "first-image.jpg" },
      { order: 5, cats: ["widgets"], headerImage: "second-image.jpg" },
    ]);

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["first-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-products-without-categories", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = [
      product({ order: 5, headerImage: "orphan-image.jpg" }),
    ];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
    });
  });

  test("buildCategoryImageMap-unknown-categories", () => {
    const testCategories = [category("widgets", "widget-header.jpg")];
    const testProducts = [
      product({
        order: 5,
        cats: ["widgets", "unknown-category"],
        headerImage: "product-image.jpg",
      }),
    ];

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 5],
      "unknown-category": ["product-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-functional-immutability", () => {
    const originalCategories = [
      category("widgets", "original.jpg", { title: "Widgets" }),
    ];
    const originalProducts = [
      product({ order: 1, cats: ["widgets"], headerImage: "test.jpg" }),
    ];

    const categoriesCopy = JSON.parse(JSON.stringify(originalCategories));
    const productsCopy = JSON.parse(JSON.stringify(originalProducts));

    const result1 = buildCategoryImageMap(categoriesCopy, productsCopy);
    const result2 = buildCategoryImageMap(categoriesCopy, productsCopy);

    // Verify inputs are unchanged
    expect(categoriesCopy).toEqual(originalCategories);
    expect(productsCopy).toEqual(originalProducts);

    // Verify function is pure (same inputs = same outputs)
    expect(result1).toEqual(result2);

    // Verify results are new objects
    expect(result1).not.toBe(result2);
  });

  test("buildCategoryImageMap-complex-scenario", () => {
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

    const result = buildCategoryImageMap(testCategories, testProducts);

    expect(result).toEqual({
      widgets: ["cross-category.jpg", 3],
      gadgets: ["cross-category.jpg", 3],
      tools: ["high-priority-tool.jpg", 5],
    });
  });
});
