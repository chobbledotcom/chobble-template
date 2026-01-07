import { describe, expect, test } from "bun:test";
import {
  addGallery,
  computeGallery,
  configureProducts,
  createApiSkusCollection,
  createProductsCollection,
  getFeaturedProducts,
  getProductsByCategories,
  getProductsByCategory,
  getProductsByEvent,
  processGallery,
} from "#collections/products.js";
import {
  collectionApi,
  createMockEleventyConfig,
  expectGalleries,
  expectResultTitles,
  item,
  items,
} from "#test/test-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a product option (SKU variant)
 */
const option = (sku, name, unit_price, max_quantity = null) => ({
  sku,
  ...(name && { name }),
  unit_price,
  ...(max_quantity && { max_quantity }),
});

/** Products with various category setups for testing */
const categorizedProducts = () =>
  items([
    ["Product 1", { categories: ["widgets", "gadgets"] }],
    ["Product 2", { categories: ["tools"] }],
    ["Product 3", { categories: ["widgets"] }],
    ["Product 4", {}],
  ]);

describe("products", () => {
  test("Converts object galleries to arrays of filenames", () => {
    const input = {
      0: "image1.jpg",
      1: "image2.jpg",
      2: "image3.jpg",
      3: "image4.jpg",
    };

    const result = processGallery(input);

    expect(result.length).toBe(4);
    expect(result).toEqual([
      "image1.jpg",
      "image2.jpg",
      "image3.jpg",
      "image4.jpg",
    ]);
  });

  test("Handles items without gallery", () => {
    const testProduct = item("Test Product", { price: 100 });

    const result = addGallery(testProduct);

    expect(result.data.gallery).toBe(undefined);
    expect(result.data.title).toBe(testProduct.data.title);
    expect(result).toBe(testProduct);
  });

  test("Processes gallery in item data", () => {
    const testProduct = item("Test Product", {
      gallery: ["product.jpg", "gallery1.jpg"],
    });

    const result = addGallery(testProduct);

    expect(result.data.gallery.length).toBe(2);
    expect(result.data.gallery).toEqual(["product.jpg", "gallery1.jpg"]);
    expect(result.data.title).toBe(testProduct.data.title);
    expect(result).toBe(testProduct);
  });

  test("Processes gallery correctly while preserving object reference", () => {
    const testProduct = item("Test Product", { gallery: ["image.jpg"] });
    const productCopy = JSON.parse(JSON.stringify(testProduct));

    const result = addGallery(productCopy);

    expect(result).toBe(productCopy);
    expect(productCopy.data.gallery).toEqual(["image.jpg"]);
  });

  test("Creates products collection from API", () => {
    const assertingCollectionApi = (testItems, expectedTag = "product") => ({
      getFilteredByTag: (tag) => {
        expect(tag).toBe(expectedTag);
        return testItems;
      },
    });

    const testProducts = items([
      ["Product 1", { gallery: ["img1.jpg"] }],
      ["Product 2", {}],
      ["Product 3", { gallery: ["img3.jpg"] }],
    ]);

    const result = createProductsCollection(
      assertingCollectionApi(testProducts),
    );

    expectGalleries(result, [["img1.jpg"], undefined, ["img3.jpg"]]);
  });

  test("Filters products by category", () => {
    const result = getProductsByCategory(categorizedProducts(), "widgets");

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Handles products without categories", () => {
    const testProducts = items([
      ["Product 1", {}],
      ["Product 2", { categories: null }],
      ["Product 3", { categories: [] }],
    ]);

    const result = getProductsByCategory(testProducts, "widgets");

    expect(result.length).toBe(0);
  });

  test("Gets products from multiple categories", () => {
    const testProducts = items([
      ["Product 1", { categories: ["widgets"] }],
      ["Product 2", { categories: ["tools"] }],
      ["Product 3", { categories: ["gadgets"] }],
      ["Product 4", { categories: ["other"] }],
    ]);

    const result = getProductsByCategories(testProducts, [
      "widgets",
      "gadgets",
    ]);

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Returns unique products even if in multiple categories", () => {
    const result = getProductsByCategories(categorizedProducts().slice(0, 3), [
      "widgets",
      "gadgets",
    ]);

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Handles empty or null inputs", () => {
    const testProducts = [item("Product 1", { categories: ["widgets"] })];

    expect(getProductsByCategories(null, ["widgets"])).toEqual([]);
    expect(getProductsByCategories(testProducts, null)).toEqual([]);
    expect(getProductsByCategories(testProducts, [])).toEqual([]);
  });

  test("Returns empty when no products match categories", () => {
    const testProducts = items([
      ["Product 1", { categories: ["widgets"] }],
      ["Product 2", {}],
    ]);

    const result = getProductsByCategories(testProducts, ["nonexistent"]);

    expect(result.length).toBe(0);
  });

  test("Configures products collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureProducts(mockConfig);

    expect(typeof mockConfig.collections.products).toBe("function");
    expect(typeof mockConfig.collections.productsWithReviewsPage).toBe(
      "function",
    );
    expect(typeof mockConfig.collections.productReviewsRedirects).toBe(
      "function",
    );
    expect(typeof mockConfig.filters.getProductsByCategory).toBe("function");
    expect(typeof mockConfig.filters.getProductsByCategories).toBe("function");
    expect(typeof mockConfig.filters.getFeaturedProducts).toBe("function");

    expect(mockConfig.filters.getProductsByCategory).toBe(
      getProductsByCategory,
    );
    expect(mockConfig.filters.getProductsByCategories).toBe(
      getProductsByCategories,
    );
    expect(mockConfig.filters.getFeaturedProducts).toBe(getFeaturedProducts);
  });

  test("Filters products by featured flag", () => {
    const testProducts = items([
      ["Product 1", { featured: true }],
      ["Product 2", { featured: false }],
      ["Product 3", { featured: true }],
      ["Product 4", {}],
    ]);

    const result = getFeaturedProducts(testProducts);

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Returns empty array when no products are featured", () => {
    const testProducts = items([
      ["Product 1", { featured: false }],
      ["Product 2", {}],
    ]);

    const result = getFeaturedProducts(testProducts);

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined products array", () => {
    expect(getFeaturedProducts(null)).toEqual([]);
    expect(getFeaturedProducts(undefined)).toEqual([]);
  });

  test("Returns gallery when present", () => {
    const data = { gallery: ["img1.jpg", "img2.jpg"] };
    const result = computeGallery(data);
    expect(result).toEqual(["img1.jpg", "img2.jpg"]);
  });

  test("Wraps header_image in array when no gallery", () => {
    const data = { header_image: "header.jpg" };
    const result = computeGallery(data);
    expect(result).toEqual(["header.jpg"]);
  });

  test("Returns undefined when no gallery or header_image", () => {
    const data = { title: "Product" };
    const result = computeGallery(data);
    expect(result).toBe(undefined);
  });

  test("Filters products by event slug", () => {
    const testProducts = items([
      ["Product 1", { events: ["summer-sale", "black-friday"] }],
      ["Product 2", { events: ["winter-sale"] }],
      ["Product 3", { events: ["summer-sale"] }],
      ["Product 4", {}],
    ]);

    const result = getProductsByEvent(testProducts, "summer-sale");

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Creates SKU mapping from products with options", () => {
    const testProducts = [
      item("T-Shirt", {
        options: [
          option("TSHIRT-S", "Small", 1999, 10),
          option("TSHIRT-M", "Medium", 1999),
        ],
      }),
      item("Mug", {
        options: [option("MUG-001", null, 999)],
      }),
    ];

    const result = createApiSkusCollection(collectionApi(testProducts));

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

  test("Skips products without options or incomplete SKUs", () => {
    const testProducts = [
      item("No Options"),
      item("Empty Options", { options: [] }),
      item("Missing SKU", { options: [{ name: "Test", unit_price: 100 }] }),
      item("Missing Price", {
        options: [{ sku: "TEST-001", name: "Test" }],
      }),
    ];

    const result = createApiSkusCollection(collectionApi(testProducts));

    expect(result).toEqual({});
  });

  test("Throws error for duplicate SKUs across products", () => {
    const testProducts = [
      item("Product A", { options: [option("DUPE-001", "Option A", 100)] }),
      item("Product B", { options: [option("DUPE-001", "Option B", 200)] }),
    ];

    expect(() => createApiSkusCollection(collectionApi(testProducts))).toThrow(
      'Duplicate SKU "DUPE-001" found in product "Product B - Option B"',
    );
  });

  test("Throws error for duplicate SKUs within same product", () => {
    const testProducts = [
      item("Product A", {
        options: [
          option("SAME-SKU", "Option 1", 100),
          option("SAME-SKU", "Option 2", 150),
        ],
      }),
    ];

    expect(() => createApiSkusCollection(collectionApi(testProducts))).toThrow(
      'Duplicate SKU "SAME-SKU"',
    );
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const testProducts = [item("Product 1", { categories: ["widgets"] })];
    const productsCopy = structuredClone(testProducts);

    getProductsByCategory(productsCopy, "widgets");

    expect(productsCopy).toEqual(testProducts);
  });
});
