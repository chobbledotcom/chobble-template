import { describe, expect, test } from "bun:test";
import {
  addGallery,
  computeGallery,
  configureProducts,
} from "#collections/products.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
  item,
  items,
  taggedCollectionApi,
} from "#test/test-utils.js";

// ============================================
// Test Fixture Builders
// ============================================

/** Create a product option (SKU variant) */
const option = (sku, name, unit_price, max_quantity = null) => ({
  sku,
  ...(name && { name }),
  unit_price,
  ...(max_quantity && { max_quantity }),
});

/** Standard categorized products for filter testing */
const categorizedProducts = () =>
  items([
    ["Product 1", { categories: ["widgets", "gadgets"] }],
    ["Product 2", { categories: ["tools"] }],
    ["Product 3", { categories: ["widgets"] }],
    ["Product 4", {}],
  ]);

/** Get a configured mock with products registered */
const setupProductsConfig = () => {
  const mockConfig = createMockEleventyConfig();
  configureProducts(mockConfig);
  return mockConfig;
};

describe("products", () => {
  describe("configureProducts", () => {
    test("registers collections and filters with Eleventy", () => {
      const mockConfig = setupProductsConfig();

      expect(typeof mockConfig.collections.products).toBe("function");
      expect(typeof mockConfig.collections.apiSkus).toBe("function");
      expect(typeof mockConfig.collections.productsWithReviewsPage).toBe(
        "function",
      );
      expect(typeof mockConfig.collections.productReviewsRedirects).toBe(
        "function",
      );
      expect(typeof mockConfig.filters.getProductsByCategory).toBe("function");
      expect(typeof mockConfig.filters.getProductsByCategories).toBe(
        "function",
      );
      expect(typeof mockConfig.filters.getProductsByEvent).toBe("function");
      expect(typeof mockConfig.filters.getFeaturedProducts).toBe("function");
    });
  });

  describe("products collection", () => {
    test("processes gallery data in products", () => {
      const mockConfig = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { gallery: ["img1.jpg"] }],
        ["Product 2", {}],
        ["Product 3", { gallery: ["img3.jpg", "img3b.jpg"] }],
      ]);

      const result = mockConfig.collections.products(
        taggedCollectionApi({ products: testProducts }),
      );

      expect(result[0].data.gallery).toEqual(["img1.jpg"]);
      expect(result[1].data.gallery).toBe(undefined);
      expect(result[2].data.gallery).toEqual(["img3.jpg", "img3b.jpg"]);
    });

    test("converts object galleries to arrays", () => {
      const mockConfig = setupProductsConfig();
      const testProducts = [
        item("Product", {
          gallery: { 0: "image1.jpg", 1: "image2.jpg", 2: "image3.jpg" },
        }),
      ];

      const result = mockConfig.collections.products(
        taggedCollectionApi({ products: testProducts }),
      );

      expect(result[0].data.gallery).toEqual([
        "image1.jpg",
        "image2.jpg",
        "image3.jpg",
      ]);
    });
  });

  describe("apiSkus collection", () => {
    test("creates SKU mapping from products with options", () => {
      const mockConfig = setupProductsConfig();
      const testProducts = [
        item("T-Shirt", {
          options: [
            option("TSHIRT-S", "Small", 1999, 10),
            option("TSHIRT-M", "Medium", 1999),
          ],
        }),
        item("Mug", { options: [option("MUG-001", null, 999)] }),
      ];

      const result = mockConfig.collections.apiSkus(
        taggedCollectionApi({ products: testProducts }),
      );

      expect(result["TSHIRT-S"]).toEqual({
        name: "T-Shirt - Small",
        unit_price: 1999,
        max_quantity: 10,
      });
      expect(result["TSHIRT-M"]).toEqual({
        name: "T-Shirt - Medium",
        unit_price: 1999,
        max_quantity: null,
      });
      expect(result["MUG-001"]).toEqual({
        name: "Mug",
        unit_price: 999,
        max_quantity: null,
      });
    });

    test("skips products without options or options without SKUs", () => {
      const mockConfig = setupProductsConfig();
      const testProducts = [
        item("No Options"),
        item("Empty Options", { options: [] }),
        item("Missing SKU", { options: [{ name: "Test", unit_price: 100 }] }),
      ];

      const result = mockConfig.collections.apiSkus(
        taggedCollectionApi({ products: testProducts }),
      );

      expect(result).toEqual({});
    });

    test.each([
      {
        name: "across products",
        products: () => [
          item("Product A", { options: [option("DUPE", "Option A", 100)] }),
          item("Product B", { options: [option("DUPE", "Option B", 200)] }),
        ],
        error: 'Duplicate SKU "DUPE"',
      },
      {
        name: "within same product",
        products: () => [
          item("Product", {
            options: [
              option("DUPE", "Opt 1", 100),
              option("DUPE", "Opt 2", 150),
            ],
          }),
        ],
        error: 'Duplicate SKU "DUPE"',
      },
    ])("throws error for duplicate SKUs $name", ({ products, error }) => {
      const mockConfig = setupProductsConfig();
      expect(() =>
        mockConfig.collections.apiSkus(
          taggedCollectionApi({ products: products() }),
        ),
      ).toThrow(error);
    });
  });

  describe("getProductsByCategory filter", () => {
    test("filters products by single category", () => {
      const { filters } = setupProductsConfig();

      const result = filters.getProductsByCategory(
        categorizedProducts(),
        "widgets",
      );

      expectResultTitles(result, ["Product 1", "Product 3"]);
    });

    test("handles products without categories", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", {}],
        ["Product 2", { categories: null }],
        ["Product 3", { categories: [] }],
      ]);

      const result = filters.getProductsByCategory(testProducts, "widgets");

      expect(result.length).toBe(0);
    });
  });

  describe("getProductsByCategories filter", () => {
    test("filters products from multiple categories", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { categories: ["widgets"] }],
        ["Product 2", { categories: ["tools"] }],
        ["Product 3", { categories: ["gadgets"] }],
        ["Product 4", { categories: ["other"] }],
      ]);

      const result = filters.getProductsByCategories(testProducts, [
        "widgets",
        "gadgets",
      ]);

      expectResultTitles(result, ["Product 1", "Product 3"]);
    });

    test("returns unique products even if in multiple selected categories", () => {
      const { filters } = setupProductsConfig();
      // categorizedProducts() has Product 1 in both widgets AND gadgets
      const result = filters.getProductsByCategories(categorizedProducts(), [
        "widgets",
        "gadgets",
      ]);
      // Product 1 matches both but should only appear once
      expectResultTitles(result, ["Product 1", "Product 3"]);
    });

    test("handles empty or null inputs", () => {
      const { filters } = setupProductsConfig();
      const testProducts = [item("Product 1", { categories: ["widgets"] })];

      expect(filters.getProductsByCategories(null, ["widgets"])).toEqual([]);
      expect(filters.getProductsByCategories(testProducts, null)).toEqual([]);
      expect(filters.getProductsByCategories(testProducts, [])).toEqual([]);
    });

    test("returns empty array when no products match categories", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { categories: ["widgets"] }],
        ["Product 2", {}],
      ]);

      const result = filters.getProductsByCategories(testProducts, [
        "nonexistent",
      ]);

      expect(result.length).toBe(0);
    });
  });

  describe("getProductsByEvent filter", () => {
    test("filters products by event slug", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { events: ["summer-sale", "black-friday"] }],
        ["Product 2", { events: ["winter-sale"] }],
        ["Product 3", { events: ["summer-sale"] }],
        ["Product 4", {}],
      ]);

      const result = filters.getProductsByEvent(testProducts, "summer-sale");

      expectResultTitles(result, ["Product 1", "Product 3"]);
    });
  });

  describe("getFeaturedProducts filter", () => {
    test("filters products by featured flag", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { featured: true }],
        ["Product 2", { featured: false }],
        ["Product 3", { featured: true }],
        ["Product 4", {}],
      ]);

      const result = filters.getFeaturedProducts(testProducts);

      expectResultTitles(result, ["Product 1", "Product 3"]);
    });

    test("returns empty array when no products are featured", () => {
      const { filters } = setupProductsConfig();
      const testProducts = items([
        ["Product 1", { featured: false }],
        ["Product 2", {}],
      ]);

      const result = filters.getFeaturedProducts(testProducts);

      expect(result.length).toBe(0);
    });
  });

  describe("addGallery helper", () => {
    test("handles items without gallery", () => {
      const testProduct = item("Test Product", { price: 100 });

      const result = addGallery(testProduct);

      expect(result.data.gallery).toBe(undefined);
      expect(result.data.title).toBe(testProduct.data.title);
      expect(result).toBe(testProduct);
    });

    test("processes gallery in item data", () => {
      const testProduct = item("Test Product", {
        gallery: ["product.jpg", "gallery1.jpg"],
      });

      const result = addGallery(testProduct);

      expect(result.data.gallery.length).toBe(2);
      expect(result.data.gallery).toEqual(["product.jpg", "gallery1.jpg"]);
      expect(result.data.title).toBe(testProduct.data.title);
      expect(result).toBe(testProduct);
    });

    test("preserves object reference while processing gallery", () => {
      const testProduct = item("Test Product", { gallery: ["image.jpg"] });
      const productCopy = JSON.parse(JSON.stringify(testProduct));

      const result = addGallery(productCopy);

      expect(result).toBe(productCopy);
      expect(productCopy.data.gallery).toEqual(["image.jpg"]);
    });
  });

  describe("computeGallery helper", () => {
    test("returns gallery when present", () => {
      const data = { gallery: ["img1.jpg", "img2.jpg"] };
      const result = computeGallery(data);
      expect(result).toEqual(["img1.jpg", "img2.jpg"]);
    });

    test("wraps header_image in array when no gallery", () => {
      const data = { header_image: "header.jpg" };
      const result = computeGallery(data);
      expect(result).toEqual(["header.jpg"]);
    });

    test("returns undefined when no gallery or header_image", () => {
      const data = { title: "Product" };
      const result = computeGallery(data);
      expect(result).toBe(undefined);
    });
  });

  describe("filter purity", () => {
    test("filter functions do not modify inputs", () => {
      const { filters } = setupProductsConfig();
      const testProducts = [item("Product 1", { categories: ["widgets"] })];
      const productsCopy = structuredClone(testProducts);

      filters.getProductsByCategory(productsCopy, "widgets");

      expect(productsCopy).toEqual(testProducts);
    });
  });
});
