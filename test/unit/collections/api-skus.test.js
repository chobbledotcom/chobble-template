import { describe, expect, test } from "bun:test";
import { configureProducts } from "#collections/products.js";
import {
  createMockEleventyConfig,
  item,
  taggedCollectionApi,
} from "#test/test-utils.js";

const setupConfig = () => {
  const mockConfig = createMockEleventyConfig();
  configureProducts(mockConfig);
  return mockConfig;
};

const menuOption = (sku, unitPrice, maxQuantity = null) => ({
  sku,
  unit_price: unitPrice,
  ...(maxQuantity && { max_quantity: maxQuantity }),
});

const menuEntry = (name, overrides = {}) => item(name, { name, ...overrides });

describe("apiSkus menu-item entries", () => {
  test("includes buyable menu-item SKUs with parsed price and resolved max quantity", () => {
    const mockConfig = setupConfig();
    const products = [item("Mug", { options: [menuOption("MUG1", 999)] })];
    const menuItems = [
      menuEntry("Beyond Burger", {
        sku: "MBRGR1",
        price: "£15.00",
        max_quantity: 5,
      }),
      menuEntry("Brownie", { sku: "MBRWNI", price: "£6.50" }),
    ];

    const result = mockConfig.collections.apiSkus(
      taggedCollectionApi({ products, "menu-items": menuItems }),
    );

    expect(result.MBRGR1).toEqual({
      name: "Beyond Burger",
      unit_price: 15,
      max_quantity: 5,
    });
    // No-override menu item resolves max_quantity via the config default;
    // assert name/price only to avoid coupling to that default's value.
    expect(result.MBRWNI).toMatchObject({
      name: "Brownie",
      unit_price: 6.5,
    });
    expect(result.MUG1).toEqual({
      name: "Mug",
      unit_price: 999,
      max_quantity: null,
    });
  });

  test("skips menu items without a sku, ambiguous price, or unparseable price", () => {
    const mockConfig = setupConfig();
    const menuItems = [
      menuEntry("No SKU", { price: "£8.00" }),
      menuEntry("Ambiguous", { sku: "AMB1", price: "£10 / £12" }),
      menuEntry("Unparseable", { sku: "UNP1", price: "Market price" }),
      menuEntry("Buyable", { sku: "BUY1", price: "£9.00" }),
    ];

    const result = mockConfig.collections.apiSkus(
      taggedCollectionApi({ products: [], "menu-items": menuItems }),
    );

    expect(Object.keys(result)).toEqual(["BUY1"]);
  });
});

describe("apiSkus duplicate detection across products and menu items", () => {
  test("throws when a SKU is shared between a product option and a menu item", () => {
    const mockConfig = setupConfig();
    const products = [
      item("Product", { options: [menuOption("SHARED", 100)] }),
    ];
    const menuItems = [
      menuEntry("Menu Item", { sku: "SHARED", price: "£8.00" }),
    ];

    expect(() =>
      mockConfig.collections.apiSkus(
        taggedCollectionApi({ products, "menu-items": menuItems }),
      ),
    ).toThrow('Duplicate SKU "SHARED"');
  });
});
