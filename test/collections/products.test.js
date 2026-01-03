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
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("products", () => {
  test("Returns null/undefined gallery unchanged", () => {
    expect(processGallery(null)).toBe(null);
    expect(processGallery(undefined)).toBe(undefined);
  });

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
    const item = {
      data: {
        title: "Test Product",
        price: 100,
      },
    };

    const result = addGallery(item);

    expect(result.data.gallery).toBe(undefined);
    expect(result.data.title).toBe(item.data.title);
    expect(result).toBe(item);
  });

  test("Processes gallery in item data", () => {
    const item = {
      data: {
        title: "Test Product",
        gallery: ["product.jpg", "gallery1.jpg"],
      },
    };

    const result = addGallery(item);

    expect(result.data.gallery.length).toBe(2);

    expect(result.data.gallery).toEqual(["product.jpg", "gallery1.jpg"]);

    expect(result.data.title).toBe(item.data.title);
    expect(result).toBe(item);
  });

  test("Processes gallery correctly while preserving object reference", () => {
    const originalItem = {
      data: {
        title: "Test Product",
        gallery: ["image.jpg"],
      },
    };
    const itemCopy = JSON.parse(JSON.stringify(originalItem));

    const result = addGallery(itemCopy);

    expect(result).toBe(itemCopy);
    expect(itemCopy.data.gallery).toEqual(["image.jpg"]);
  });

  test("Creates products collection from API", () => {
    const mockProducts = [
      { data: { title: "Product 1", gallery: ["img1.jpg"] } },
      { data: { title: "Product 2" } },
      { data: { title: "Product 3", gallery: ["img3.jpg"] } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("product");
        return mockProducts;
      },
    };

    const result = createProductsCollection(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.gallery).toEqual(["img1.jpg"]);
    expect(result[1].data.gallery).toBe(undefined);
    expect(result[2].data.gallery).toEqual(["img3.jpg"]);
  });

  test("Filters products by category", () => {
    const products = [
      { data: { title: "Product 1", categories: ["widgets", "gadgets"] } },
      { data: { title: "Product 2", categories: ["tools"] } },
      { data: { title: "Product 3", categories: ["widgets"] } },
      { data: { title: "Product 4" } },
    ];

    const result = getProductsByCategory(products, "widgets");

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Product 1");
    expect(result[1].data.title).toBe("Product 3");
  });

  test("Handles products without categories", () => {
    const products = [
      { data: { title: "Product 1" } },
      { data: { title: "Product 2", categories: null } },
      { data: { title: "Product 3", categories: [] } },
    ];

    const result = getProductsByCategory(products, "widgets");

    expect(result.length).toBe(0);
  });

  test("Gets products from multiple categories", () => {
    const products = [
      { data: { title: "Product 1", categories: ["widgets"] } },
      { data: { title: "Product 2", categories: ["tools"] } },
      { data: { title: "Product 3", categories: ["gadgets"] } },
      { data: { title: "Product 4", categories: ["other"] } },
    ];

    const result = getProductsByCategories(products, ["widgets", "gadgets"]);

    expect(result.length).toBe(2);
    const titles = result.map((p) => p.data.title);
    expect(titles.includes("Product 1")).toBe(true);
    expect(titles.includes("Product 3")).toBe(true);
  });

  test("Returns unique products even if in multiple categories", () => {
    const products = [
      { data: { title: "Product 1", categories: ["widgets", "gadgets"] } },
      { data: { title: "Product 2", categories: ["tools"] } },
      { data: { title: "Product 3", categories: ["widgets"] } },
    ];

    const result = getProductsByCategories(products, ["widgets", "gadgets"]);

    expect(result.length).toBe(2);
    const titles = result.map((p) => p.data.title);
    expect(titles.includes("Product 1")).toBe(true);
    expect(titles.includes("Product 3")).toBe(true);
  });

  test("Handles empty or null inputs", () => {
    const products = [
      { data: { title: "Product 1", categories: ["widgets"] } },
    ];

    expect(getProductsByCategories(null, ["widgets"])).toEqual([]);
    expect(getProductsByCategories(products, null)).toEqual([]);
    expect(getProductsByCategories(products, [])).toEqual([]);
  });

  test("Returns empty when no products match categories", () => {
    const products = [
      { data: { title: "Product 1", categories: ["widgets"] } },
      { data: { title: "Product 2" } },
    ];

    const result = getProductsByCategories(products, ["nonexistent"]);

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
    const products = [
      { data: { title: "Product 1", featured: true } },
      { data: { title: "Product 2", featured: false } },
      { data: { title: "Product 3", featured: true } },
      { data: { title: "Product 4" } },
    ];

    const result = getFeaturedProducts(products);

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Product 1");
    expect(result[1].data.title).toBe("Product 3");
  });

  test("Returns empty array when no products are featured", () => {
    const products = [
      { data: { title: "Product 1", featured: false } },
      { data: { title: "Product 2" } },
    ];

    const result = getFeaturedProducts(products);

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
    const products = [
      {
        data: { title: "Product 1", events: ["summer-sale", "black-friday"] },
      },
      { data: { title: "Product 2", events: ["winter-sale"] } },
      { data: { title: "Product 3", events: ["summer-sale"] } },
      { data: { title: "Product 4" } },
    ];

    const result = getProductsByEvent(products, "summer-sale");

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Product 1");
    expect(result[1].data.title).toBe("Product 3");
  });

  test("Returns empty array for null products", () => {
    expect(getProductsByEvent(null, "sale")).toEqual([]);
  });

  test("Creates SKU mapping from products with options", () => {
    const mockProducts = [
      {
        data: {
          title: "T-Shirt",
          options: [
            {
              sku: "TSHIRT-S",
              name: "Small",
              unit_price: 1999,
              max_quantity: 10,
            },
            { sku: "TSHIRT-M", name: "Medium", unit_price: 1999 },
          ],
        },
      },
      {
        data: {
          title: "Mug",
          options: [{ sku: "MUG-001", unit_price: 999 }],
        },
      },
    ];

    const mockCollectionApi = {
      getFilteredByTag: () => mockProducts,
    };

    const result = createApiSkusCollection(mockCollectionApi);

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
    const mockProducts = [
      { data: { title: "No Options" } },
      { data: { title: "Empty Options", options: [] } },
      {
        data: {
          title: "Missing SKU",
          options: [{ name: "Test", unit_price: 100 }],
        },
      },
      {
        data: {
          title: "Missing Price",
          options: [{ sku: "TEST-001", name: "Test" }],
        },
      },
    ];

    const mockCollectionApi = {
      getFilteredByTag: () => mockProducts,
    };

    const result = createApiSkusCollection(mockCollectionApi);

    expect(result).toEqual({});
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const originalProducts = [
      { data: { title: "Product 1", categories: ["widgets"] } },
    ];

    const productsCopy = structuredClone(originalProducts);

    getProductsByCategory(productsCopy, "widgets");

    expect(productsCopy).toEqual(originalProducts);
  });
});
