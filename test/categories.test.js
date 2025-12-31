import assert from "assert";
import {
  assignCategoryImages,
  buildCategoryImageMap,
  configureCategories,
  createCategoriesCollection,
  getFeaturedCategories,
} from "#collections/categories.js";
import { createTestRunner } from "#test/test-utils.js";

const mockEleventyConfig = {
  addCollection: function (name, fn) {
    this.collections = this.collections || {};
    this.collections[name] = fn;
  },
  addFilter: function (name, fn) {
    this.filters = this.filters || {};
    this.filters[name] = fn;
  },
};

const testCases = [
  {
    name: "buildCategoryImageMap-empty-data",
    description: "Handles empty categories and products",
    test: () => {
      const result = buildCategoryImageMap([], []);

      assert.deepStrictEqual(
        result,
        {},
        "Should return empty object for empty input",
      );
    },
  },
  {
    name: "buildCategoryImageMap-categories-only",
    description: "Maps category images when no products",
    test: () => {
      const categories = [
        { fileSlug: "widgets", data: { header_image: "widget-header.jpg" } },
        { fileSlug: "gadgets", data: { header_image: "gadget-header.jpg" } },
      ];

      const result = buildCategoryImageMap(categories, []);

      assert.deepStrictEqual(
        result,
        {
          widgets: ["widget-header.jpg", -1],
          gadgets: ["gadget-header.jpg", -1],
        },
        "Should map category header images with order -1",
      );
    },
  },
  {
    name: "buildCategoryImageMap-no-category-images",
    description: "Handles categories without header images",
    test: () => {
      const categories = [
        { fileSlug: "widgets", data: {} },
        { fileSlug: "gadgets", data: { header_image: null } },
      ];

      const result = buildCategoryImageMap(categories, []);

      assert.deepStrictEqual(
        result,
        {
          widgets: [undefined, -1],
          gadgets: [null, -1],
        },
        "Should handle missing header images",
      );
    },
  },
  {
    name: "buildCategoryImageMap-product-override",
    description: "Product images override category images when order is higher",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["product-image.jpg", 5],
        },
        "Should override category image with higher-order product image",
      );
    },
  },
  {
    name: "buildCategoryImageMap-product-no-override",
    description: "Product images do not override when order is lower",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["high-priority.jpg", 5],
        },
        "Should use highest-order product image",
      );
    },
  },
  {
    name: "buildCategoryImageMap-default-order",
    description: "Handles products without explicit order",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["product-image.jpg", 0],
        },
        "Should use order 0 as default for products",
      );
    },
  },
  {
    name: "buildCategoryImageMap-multiple-categories",
    description: "Product can affect multiple categories",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["multi-category.jpg", 3],
          gadgets: ["multi-category.jpg", 3],
        },
        "Should apply product image to all its categories",
      );
    },
  },
  {
    name: "buildCategoryImageMap-no-product-image",
    description: "Ignores products without header image",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["widget-header.jpg", -1],
        },
        "Should ignore products without header image",
      );
    },
  },
  {
    name: "assignCategoryImages-basic",
    description: "Assigns images to categories from image map",
    test: () => {
      const categories = [
        { fileSlug: "widgets", data: { title: "Widgets" } },
        { fileSlug: "gadgets", data: { title: "Gadgets" } },
      ];

      const categoryImages = {
        widgets: ["widget-final.jpg", 5],
        gadgets: ["gadget-final.jpg", 3],
      };

      const result = assignCategoryImages(categories, categoryImages);

      assert.strictEqual(
        result[0].data.header_image,
        "widget-final.jpg",
        "Should assign widget image",
      );
      assert.strictEqual(
        result[1].data.header_image,
        "gadget-final.jpg",
        "Should assign gadget image",
      );
      assert.strictEqual(
        result[0].data.title,
        "Widgets",
        "Should preserve other category data",
      );
    },
  },
  {
    name: "assignCategoryImages-missing-mapping",
    description: "Handles categories not in image map",
    test: () => {
      const categories = [{ fileSlug: "widgets", data: { title: "Widgets" } }];

      const categoryImages = {};

      const result = assignCategoryImages(categories, categoryImages);

      assert.strictEqual(
        result[0].data.header_image,
        undefined,
        "Should assign undefined for missing mapping",
      );
    },
  },
  {
    name: "assignCategoryImages-mutates-original",
    description: "Mutates original category objects",
    test: () => {
      const categories = [{ fileSlug: "widgets", data: { title: "Widgets" } }];

      const categoryImages = {
        widgets: ["widget.jpg", 1],
      };

      const result = assignCategoryImages(categories, categoryImages);

      assert.strictEqual(
        result[0],
        categories[0],
        "Should return same object reference",
      );
      assert.strictEqual(
        categories[0].data.header_image,
        "widget.jpg",
        "Should mutate original object",
      );
    },
  },
  {
    name: "createCategoriesCollection-empty",
    description: "Returns empty array when no categories",
    test: () => {
      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "category") return [];
          if (tag === "product") return [];
          return [];
        },
      };

      const result = createCategoriesCollection(mockCollectionApi);

      assert.deepStrictEqual(
        result,
        [],
        "Should return empty array for no categories",
      );
    },
  },
  {
    name: "createCategoriesCollection-integration",
    description: "Full integration test with categories and products",
    test: () => {
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

      assert.strictEqual(result.length, 2, "Should return 2 categories");
      assert.strictEqual(
        result[0].data.header_image,
        "premium-widget.jpg",
        "Should use high-order product image for widgets",
      );
      assert.strictEqual(
        result[1].data.header_image,
        "basic-gadget.jpg",
        "Should use product image for gadgets",
      );
      assert.strictEqual(
        result[0].data.title,
        "Widgets",
        "Should preserve category title",
      );
    },
  },
  {
    name: "getFeaturedCategories-basic",
    description: "Filters categories to featured ones only",
    test: () => {
      const categories = [
        { data: { title: "Featured Category", featured: true } },
        { data: { title: "Regular Category", featured: false } },
        { data: { title: "Another Category" } },
      ];

      const result = getFeaturedCategories(categories);

      assert.strictEqual(
        result.length,
        1,
        "Should return only featured categories",
      );
      assert.strictEqual(
        result[0].data.title,
        "Featured Category",
        "Should return the featured category",
      );
    },
  },
  {
    name: "getFeaturedCategories-null-safe",
    description: "Handles null or undefined input gracefully",
    test: () => {
      assert.deepStrictEqual(
        getFeaturedCategories(null),
        [],
        "Should return empty array for null",
      );
      assert.deepStrictEqual(
        getFeaturedCategories(undefined),
        [],
        "Should return empty array for undefined",
      );
    },
  },
  {
    name: "configureCategories-basic",
    description: "Configures categories collection and filter in Eleventy",
    test: () => {
      const mockConfig = { ...mockEleventyConfig };

      configureCategories(mockConfig);

      assert(
        mockConfig.collections.categories,
        "Should add categories collection",
      );
      assert.strictEqual(
        typeof mockConfig.collections.categories,
        "function",
        "Should add function collection",
      );
      assert.strictEqual(
        mockConfig.collections.categories,
        createCategoriesCollection,
        "Should use correct collection function",
      );

      assert(
        mockConfig.filters.getFeaturedCategories,
        "Should add getFeaturedCategories filter",
      );
      assert.strictEqual(
        typeof mockConfig.filters.getFeaturedCategories,
        "function",
        "Should add function filter",
      );
      assert.strictEqual(
        mockConfig.filters.getFeaturedCategories,
        getFeaturedCategories,
        "Should use correct filter function",
      );
    },
  },
  {
    name: "buildCategoryImageMap-order-precedence",
    description: "Products with same order use first one encountered",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["first-image.jpg", 5],
        },
        "Should use first product when orders are equal (current behavior)",
      );
    },
  },
  {
    name: "buildCategoryImageMap-products-without-categories",
    description: "Handles products without categories array",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["widget-header.jpg", -1],
        },
        "Should ignore products without categories",
      );
    },
  },
  {
    name: "buildCategoryImageMap-unknown-categories",
    description: "Products referencing unknown categories create new entries",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["product-image.jpg", 5],
          "unknown-category": ["product-image.jpg", 5],
        },
        "Should create entries for unknown categories referenced by products",
      );
    },
  },
  {
    name: "buildCategoryImageMap-functional-immutability",
    description: "Function creates new objects without modifying inputs",
    test: () => {
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
      assert.deepStrictEqual(
        categoriesCopy,
        originalCategories,
        "Should not modify categories input",
      );
      assert.deepStrictEqual(
        productsCopy,
        originalProducts,
        "Should not modify products input",
      );

      // Verify function is pure (same inputs = same outputs)
      assert.deepStrictEqual(
        result1,
        result2,
        "Should produce identical results for same inputs",
      );

      // Verify results are new objects
      assert.notStrictEqual(
        result1,
        result2,
        "Should create new result objects each time",
      );
    },
  },
  {
    name: "buildCategoryImageMap-complex-scenario",
    description: "Complex scenario with multiple products and categories",
    test: () => {
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

      assert.deepStrictEqual(
        result,
        {
          widgets: ["cross-category.jpg", 3],
          gadgets: ["cross-category.jpg", 3],
          tools: ["high-priority-tool.jpg", 5],
        },
        "Should handle complex multi-category, multi-order scenario correctly",
      );
    },
  },
  {
    name: "categories-functions-pure",
    description: "Functions should not modify input parameters inappropriately",
    test: () => {
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

      assert.deepStrictEqual(
        categoriesCopy,
        originalCategories,
        "buildCategoryImageMap should not modify categories",
      );
      assert.deepStrictEqual(
        productsCopy,
        originalProducts,
        "buildCategoryImageMap should not modify products",
      );
    },
  },
];

export default createTestRunner("categories", testCases);
