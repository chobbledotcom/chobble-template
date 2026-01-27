import { describe, expect, test } from "bun:test";
import { configureCategories } from "#collections/categories.js";
import {
  createMockEleventyConfig,
  expectDataArray,
  getCollectionFrom,
} from "#test/test-utils.js";
import { map } from "#toolkit/fp/array.js";

const expectHeaderImages = expectDataArray("header_image");

// Fixture builders
const cat = (slug, headerImage, extraData = {}) => ({
  fileSlug: slug,
  data: {
    ...(headerImage !== undefined && { header_image: headerImage }),
    ...extraData,
  },
});

const cats = map(([slug, headerImage, extraData]) =>
  cat(slug, headerImage, extraData),
);

const prod = ({ order, cats: c = [], headerImage, ...extra } = {}) => ({
  data: {
    ...(order !== undefined && { order }),
    categories: c,
    ...(headerImage && { header_image: headerImage }),
    ...extra,
  },
});

const prods = map(prod);

const getCollection = getCollectionFrom("categories")(configureCategories);

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
      expect(getCollection({ categories: [], products: [] })).toEqual([]);
    });

    test("returns categories with their own header images when no products", () => {
      const categories = cats([
        ["widgets", "widget-header.jpg", { title: "Widgets" }],
        ["gadgets", "gadget-header.jpg", { title: "Gadgets" }],
      ]);
      expectHeaderImages(getCollection({ categories, products: [] }), [
        "widget-header.jpg",
        "gadget-header.jpg",
      ]);
    });

    test("inherits header image from highest-order product in category", () => {
      const categories = cats([["widgets", "default-widget.jpg"]]);
      const products = prods([
        { order: 2, cats: ["widgets"], headerImage: "low-priority.jpg" },
        { order: 5, cats: ["widgets"], headerImage: "high-priority.jpg" },
        { order: 3, cats: ["widgets"], headerImage: "mid-priority.jpg" },
      ]);
      expectHeaderImages(getCollection({ categories, products }), [
        "high-priority.jpg",
      ]);
    });

    test("uses category default when products have no header images", () => {
      const categories = [cat("widgets", "widget-header.jpg")];
      const products = [prod({ order: 10, cats: ["widgets"] })];
      expectHeaderImages(getCollection({ categories, products }), [
        "widget-header.jpg",
      ]);
    });

    test("product with order 0 (default) can override category image", () => {
      const categories = [cat("widgets", "widget-header.jpg")];
      const products = [
        prod({ cats: ["widgets"], headerImage: "product-image.jpg" }),
      ];
      expectHeaderImages(getCollection({ categories, products }), [
        "product-image.jpg",
      ]);
    });

    test("handles products in multiple categories", () => {
      const categories = cats([
        ["widgets", "widget-default.jpg"],
        ["gadgets", "gadget-default.jpg"],
      ]);
      const products = [
        prod({
          order: 5,
          cats: ["widgets", "gadgets"],
          headerImage: "shared-image.jpg",
        }),
      ];
      expectHeaderImages(getCollection({ categories, products }), [
        "shared-image.jpg",
        "shared-image.jpg",
      ]);
    });

    test("ignores products without categories", () => {
      const categories = [cat("widgets", "widget-header.jpg")];
      const products = [prod({ order: 10, headerImage: "orphan-image.jpg" })];
      expectHeaderImages(getCollection({ categories, products }), [
        "widget-header.jpg",
      ]);
    });

    test("preserves category data properties", () => {
      const categories = cats([
        ["widgets", undefined, { title: "Widgets", featured: true }],
      ]);
      const products = prods([
        { order: 5, cats: ["widgets"], headerImage: "product.jpg" },
      ]);
      const result = getCollection({ categories, products });

      expect(result[0].data.title).toBe("Widgets");
      expect(result[0].data.featured).toBe(true);
      expect(result[0].data.header_image).toBe("product.jpg");
    });

    test("handles complex scenario with multiple categories and products", () => {
      const categories = cats([
        ["widgets", "widget-default.jpg"],
        ["gadgets", "gadget-default.jpg"],
        ["tools", undefined],
      ]);
      const products = prods([
        {
          order: 3,
          cats: ["widgets", "gadgets"],
          headerImage: "cross-category.jpg",
        },
        { order: 1, cats: ["widgets"], headerImage: "low-priority-widget.jpg" },
        { order: 5, cats: ["tools"], headerImage: "high-priority-tool.jpg" },
        { cats: ["gadgets"], headerImage: "default-order-gadget.jpg" },
      ]);
      // widgets: order 3 > order 1, so cross-category wins
      // gadgets: order 3 > order 0, so cross-category wins
      // tools: order 5 is highest
      expectHeaderImages(getCollection({ categories, products }), [
        "cross-category.jpg",
        "cross-category.jpg",
        "high-priority-tool.jpg",
      ]);
    });
  });

  describe("parent category thumbnail inheritance", () => {
    test("parent category inherits thumbnail from child with lowest order", () => {
      const categories = [
        cat("widgets", undefined, { title: "Widgets" }),
        cat("premium-widgets", undefined, {
          title: "Premium Widgets",
          parent: "widgets",
          order: 1,
        }),
        cat("budget-widgets", undefined, {
          title: "Budget Widgets",
          parent: "widgets",
          order: 2,
        }),
      ];
      const products = prods([
        { cats: ["premium-widgets"], thumbnail: "premium-thumb.jpg" },
        { cats: ["budget-widgets"], thumbnail: "budget-thumb.jpg" },
      ]);
      const result = getCollection({ categories, products });
      expect(result[0].data.thumbnail).toBe("premium-thumb.jpg");
    });

    test("parent category uses own thumbnail when set", () => {
      const categories = [
        cat("widgets", undefined, { thumbnail: "widgets-thumb.jpg" }),
        cat("premium-widgets", undefined, { parent: "widgets" }),
      ];
      const products = prods([
        { cats: ["premium-widgets"], thumbnail: "premium-thumb.jpg" },
      ]);
      expect(getCollection({ categories, products })[0].data.thumbnail).toBe(
        "widgets-thumb.jpg",
      );
    });

    test("parent category gets no thumbnail when children have none", () => {
      const categories = [
        cat("widgets", undefined, { title: "Widgets" }),
        cat("premium-widgets", undefined, { parent: "widgets" }),
      ];
      expect(
        getCollection({ categories, products: [] })[0].data.thumbnail,
      ).toBeUndefined();
    });
  });
});
