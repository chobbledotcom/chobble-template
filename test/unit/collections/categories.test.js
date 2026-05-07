import { describe, expect, test } from "bun:test";
import {
  configureCategories,
  getSubcategories,
} from "#collections/categories.js";
import {
  createMockEleventyConfig,
  getCollectionFrom,
} from "#test/test-utils.js";
import { map } from "#toolkit/fp/array.js";

// Fixture builders
const cat = (slug, thumbnail, extraData = {}) => ({
  fileSlug: slug,
  data: {
    ...(thumbnail !== undefined && { thumbnail }),
    ...extraData,
  },
});

const cats = map(([slug, thumbnail, extraData]) =>
  cat(slug, thumbnail, extraData),
);

const prods = map(({ order, cats: c = [], thumbnail, ...extra } = {}) => ({
  data: {
    ...(order !== undefined && { order }),
    categories: c,
    ...(thumbnail && { thumbnail }),
    ...extra,
  },
}));

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

    test("preserves category data properties", () => {
      const categories = cats([
        ["widgets", "own-thumb.jpg", { name: "Widgets", featured: true }],
      ]);
      const result = getCollection({ categories, products: [] });

      expect(result[0].data.name).toBe("Widgets");
      expect(result[0].data.featured).toBe(true);
      expect(result[0].data.thumbnail).toBe("own-thumb.jpg");
    });
  });

  describe("thumbnail fallback chain", () => {
    const expectThumbnail = (categories, expected, products = []) => {
      const result = getCollection({ categories, products });
      expect(result[0].data.thumbnail).toBe(expected);
    };

    test("uses own thumbnail when present", () => {
      expectThumbnail(
        [cat("widgets", undefined, { thumbnail: "thumb.jpg" })],
        "thumb.jpg",
      );
    });

    test("falls back to subcategory thumbnail before direct products", () => {
      const categories = [
        cat("electronics", undefined),
        cat("phones", undefined, {
          parent: "electronics",
          thumbnail: "phones-thumb.jpg",
        }),
      ];
      const products = prods([
        { cats: ["electronics"], thumbnail: "direct-product.jpg" },
      ]);
      expectThumbnail(categories, "phones-thumb.jpg", products);
    });

    test("falls back to product in subcategory", () => {
      const categories = [
        cat("electronics", undefined),
        cat("phones", undefined, { parent: "electronics" }),
      ];
      const products = prods([
        { cats: ["phones"], thumbnail: "phone-product.jpg" },
      ]);
      const result = getCollection({ categories, products });
      expect(result[0].data.thumbnail).toBe("phone-product.jpg");
    });

    test("own thumbnail beats products; products used as final fallback", () => {
      const products = prods([
        { cats: ["widgets", "gadgets"], thumbnail: "product-thumb.jpg" },
      ]);
      const withOwn = [cat("widgets", undefined, { thumbnail: "own.jpg" })];
      const withoutOwn = [cat("gadgets", undefined)];
      expect(
        getCollection({ categories: withOwn, products })[0].data.thumbnail,
      ).toBe("own.jpg");
      expect(
        getCollection({ categories: withoutOwn, products })[0].data.thumbnail,
      ).toBe("product-thumb.jpg");
    });

    test("inherits from lowest-order subcategory first", () => {
      const categories = [
        cat("widgets", undefined),
        cat("premium", undefined, { parent: "widgets", order: 1 }),
        cat("budget", undefined, { parent: "widgets", order: 2 }),
      ];
      const products = prods([
        { cats: ["premium"], thumbnail: "premium-thumb.jpg" },
        { cats: ["budget"], thumbnail: "budget-thumb.jpg" },
      ]);
      const result = getCollection({ categories, products });
      expect(result[0].data.thumbnail).toBe("premium-thumb.jpg");
    });

    test("uses highest-order product thumbnail when no own thumbnail", () => {
      const categories = cats([["widgets", undefined]]);
      const products = prods([
        { order: 2, cats: ["widgets"], thumbnail: "low-priority.jpg" },
        { order: 5, cats: ["widgets"], thumbnail: "high-priority.jpg" },
        { order: 3, cats: ["widgets"], thumbnail: "mid-priority.jpg" },
      ]);
      const result = getCollection({ categories, products });
      expect(result[0].data.thumbnail).toBe("high-priority.jpg");
    });

    test("returns undefined when no images exist anywhere", () => {
      const categories = [
        cat("widgets", undefined),
        cat("sub", undefined, { parent: "widgets" }),
      ];
      expect(
        getCollection({ categories, products: [] })[0].data.thumbnail,
      ).toBeUndefined();
    });
  });

  describe("getSubcategories", () => {
    test("returns subcategories matching parent slug", () => {
      const categories = [
        cat("widgets", undefined, { parent: "root" }),
        cat("gadgets", undefined, { parent: "root" }),
        cat("tools", undefined, { parent: "other" }),
      ];
      const result = getSubcategories(categories, "root");
      expect(result).toHaveLength(2);
      expect(result[0].fileSlug).toBe("widgets");
      expect(result[1].fileSlug).toBe("gadgets");
    });

    test("returns empty array for unknown parent", () => {
      const categories = [cat("widgets", undefined, { parent: "root" })];
      expect(getSubcategories(categories, "nonexistent")).toEqual([]);
    });
  });
});
