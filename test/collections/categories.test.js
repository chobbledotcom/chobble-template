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
  expectResultTitles,
} from "#test/test-utils.js";

describe("categories", () => {
  test("buildCategoryImageMap-empty-data", () => {
    const result = buildCategoryImageMap([], []);

    expect(result).toEqual({});
  });

  test("buildCategoryImageMap-categories-only", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
      { fileSlug: "gadgets", data: { header_image: "gadget-header.jpg" } },
    ];

    const result = buildCategoryImageMap(categories, []);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
      gadgets: ["gadget-header.jpg", -1],
    });
  });

  test("buildCategoryImageMap-no-category-images", () => {
    const categories = [
      { fileSlug: "widgets", data: {} },
      { fileSlug: "gadgets", data: { header_image: null } },
    ];

    const result = buildCategoryImageMap(categories, []);

    expect(result).toEqual({
      widgets: [undefined, -1],
      gadgets: [null, -1],
    });
  });

  test("buildCategoryImageMap-product-override", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 5,
          categories: ["widgets"],
          header_image: "product-image.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-product-no-override", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 2,
          categories: ["widgets"],
          header_image: "low-priority.jpg",
        },
      },
      {
        data: {
          order: 5,
          categories: ["widgets"],
          header_image: "high-priority.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["high-priority.jpg", 5],
    });
  });

  test("buildCategoryImageMap-default-order", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          categories: ["widgets"],
          header_image: "product-image.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 0],
    });
  });

  test("buildCategoryImageMap-multiple-categories", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
      { fileSlug: "gadgets", data: { header_image: "gadget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 3,
          categories: ["widgets", "gadgets"],
          header_image: "multi-category.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["multi-category.jpg", 3],
      gadgets: ["multi-category.jpg", 3],
    });
  });

  test("buildCategoryImageMap-no-product-image", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 10,
          categories: ["widgets"],
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
    });
  });

  test("assignCategoryImages-basic", () => {
    const categories = [
      { fileSlug: "widgets", data: { title: "Widgets" } },
      { fileSlug: "gadgets", data: { title: "Gadgets" } },
    ];

    const categoryImages = {
      widgets: ["widget-final.jpg", 5],
      gadgets: ["gadget-final.jpg", 3],
    };

    const result = assignCategoryImages(categories, categoryImages);

    expect(result[0].data.header_image).toBe("widget-final.jpg");
    expect(result[1].data.header_image).toBe("gadget-final.jpg");
    expect(result[0].data.title).toBe("Widgets");
  });

  test("assignCategoryImages-missing-mapping", () => {
    const categories = [{ fileSlug: "widgets", data: { title: "Widgets" } }];

    const categoryImages = {};

    const result = assignCategoryImages(categories, categoryImages);

    expect(result[0].data.header_image).toBe(undefined);
  });

  test("assignCategoryImages-mutates-original", () => {
    const categories = [{ fileSlug: "widgets", data: { title: "Widgets" } }];

    const categoryImages = {
      widgets: ["widget.jpg", 1],
    };

    const result = assignCategoryImages(categories, categoryImages);

    expect(result[0]).toBe(categories[0]);
    expect(categories[0].data.header_image).toBe("widget.jpg");
  });

  test("createCategoriesCollection-empty", () => {
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "category") return [];
        if (tag === "product") return [];
        return [];
      },
    };

    const result = createCategoriesCollection(mockCollectionApi);

    expect(result).toEqual([]);
  });

  test("createCategoriesCollection-integration", () => {
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "category") {
          return [
            {
              fileSlug: "widgets",
              data: { title: "Widgets", header_image: "default-widget.jpg" },
            },
            { fileSlug: "gadgets", data: { title: "Gadgets" } },
          ];
        }
        if (tag === "product") {
          return [
            {
              data: {
                order: 5,
                categories: ["widgets"],
                header_image: "premium-widget.jpg",
              },
            },
            {
              data: {
                order: 2,
                categories: ["gadgets"],
                header_image: "basic-gadget.jpg",
              },
            },
          ];
        }
        return [];
      },
    };

    const result = createCategoriesCollection(mockCollectionApi);

    expect(result.length).toBe(2);
    expect(result[0].data.header_image).toBe("premium-widget.jpg");
    expect(result[1].data.header_image).toBe("basic-gadget.jpg");
    expect(result[0].data.title).toBe("Widgets");
  });

  test("getFeaturedCategories-basic", () => {
    const categories = [
      { data: { title: "Featured Category", featured: true } },
      { data: { title: "Regular Category", featured: false } },
      { data: { title: "Another Category" } },
    ];

    const result = getFeaturedCategories(categories);

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
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 5,
          categories: ["widgets"],
          header_image: "first-image.jpg",
        },
      },
      {
        data: {
          order: 5,
          categories: ["widgets"],
          header_image: "second-image.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["first-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-products-without-categories", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 5,
          header_image: "orphan-image.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["widget-header.jpg", -1],
    });
  });

  test("buildCategoryImageMap-unknown-categories", () => {
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
    ];

    const products = [
      {
        data: {
          order: 5,
          categories: ["widgets", "unknown-category"],
          header_image: "product-image.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["product-image.jpg", 5],
      "unknown-category": ["product-image.jpg", 5],
    });
  });

  test("buildCategoryImageMap-functional-immutability", () => {
    const originalCategories = [
      {
        fileSlug: "widgets",
        data: { title: "Widgets", header_image: "original.jpg" },
      },
    ];
    const originalProducts = [
      {
        data: { order: 1, categories: ["widgets"], header_image: "test.jpg" },
      },
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
    const categories = [
      { fileSlug: "widgets", data: { header_image: "widget-default.jpg" } },
      { fileSlug: "gadgets", data: { header_image: "gadget-default.jpg" } },
      { fileSlug: "tools", data: {} },
    ];

    const products = [
      {
        data: {
          order: 3,
          categories: ["widgets", "gadgets"],
          header_image: "cross-category.jpg",
        },
      },
      {
        data: {
          order: 1,
          categories: ["widgets"],
          header_image: "low-priority-widget.jpg",
        },
      },
      {
        data: {
          order: 5,
          categories: ["tools"],
          header_image: "high-priority-tool.jpg",
        },
      },
      {
        data: {
          categories: ["gadgets"],
          header_image: "default-order-gadget.jpg",
        },
      },
    ];

    const result = buildCategoryImageMap(categories, products);

    expect(result).toEqual({
      widgets: ["cross-category.jpg", 3],
      gadgets: ["cross-category.jpg", 3],
      tools: ["high-priority-tool.jpg", 5],
    });
  });

  test("categories-functions-pure", () => {
    const originalCategories = [
      { fileSlug: "widgets", data: { title: "Widgets" } },
    ];
    const originalProducts = [
      {
        data: { order: 1, categories: ["widgets"], header_image: "test.jpg" },
      },
    ];

    const categoriesCopy = JSON.parse(JSON.stringify(originalCategories));
    const productsCopy = JSON.parse(JSON.stringify(originalProducts));

    buildCategoryImageMap(categoriesCopy, productsCopy);

    expect(categoriesCopy).toEqual(originalCategories);
    expect(productsCopy).toEqual(originalProducts);
  });
});
