import { describe, expect, test } from "bun:test";
import { mockModule } from "#test/test-utils.js";

// Cart behaviour depends on config.cart_mode, so mock the config module and
// then dynamically import the module under test so its getConfig binding
// resolves to the mock. Mirrors the pattern in navigation.test.js.
const mockConfig = { cart_mode: "stripe", default_max_quantity: null };
await mockModule("#data/config.js", () => ({ default: () => mockConfig }));

const { default: menuItemDatasData } = await import(
  "../../../src/menu-items/menu-items.11tydata.js"
);

const { eleventyComputed } = menuItemDatasData;

/** Decode the HTML-escaped JSON emitted by buildCartAttributes for assertions. */
const decodeCartAttributes = (encoded) =>
  encoded == null ? null : JSON.parse(encoded.replace(/&quot;/g, '"'));

const menuItemData = (overrides = {}) => ({
  name: "Beyond Burger",
  price: "£15.00",
  description: "Juicy plant burger with crispy chips.",
  ...overrides,
});

describe("menu-items cart_attributes", () => {
  test("includes the menu-item sku in the single buy option (stripe + sku)", () => {
    mockConfig.cart_mode = "stripe";
    const attrs = decodeCartAttributes(
      eleventyComputed.cart_attributes(menuItemData({ sku: "MENUMENU1" })),
    );
    expect(attrs).not.toBeNull();
    expect(attrs.options).toHaveLength(1);
    expect(attrs.options[0].sku).toBe("MENUMENU1");
    expect(attrs.options[0].unit_price).toBe(15);
    expect(attrs.product_mode).toBe("buy");
  });

  test("returns null in stripe mode when the menu item has no sku", () => {
    mockConfig.cart_mode = "stripe";
    expect(eleventyComputed.cart_attributes(menuItemData())).toBeNull();
  });

  test("returns cart attributes in quote mode without a sku", () => {
    mockConfig.cart_mode = "quote";
    const attrs = decodeCartAttributes(
      eleventyComputed.cart_attributes(menuItemData()),
    );
    expect(attrs).not.toBeNull();
    expect(attrs.options[0].sku).toBeNull();
  });

  test("returns null when cart_mode is disabled", () => {
    mockConfig.cart_mode = null;
    expect(
      eleventyComputed.cart_attributes(menuItemData({ sku: "ABC" })),
    ).toBeNull();
  });

  test("returns null for a missing price", () => {
    mockConfig.cart_mode = "quote";
    expect(
      eleventyComputed.cart_attributes(menuItemData({ price: undefined })),
    ).toBeNull();
  });

  test("returns null for a non-parseable price", () => {
    mockConfig.cart_mode = "quote";
    expect(
      eleventyComputed.cart_attributes(menuItemData({ price: "Market price" })),
    ).toBeNull();
  });

  test("returns null for an ambiguous multi-amount price", () => {
    mockConfig.cart_mode = "quote";
    expect(
      eleventyComputed.cart_attributes(menuItemData({ price: "£10 / £12" })),
    ).toBeNull();
    expect(
      eleventyComputed.cart_attributes(
        menuItemData({ sku: "ABC", price: "from £8 to £14" }),
      ),
    ).toBeNull();
  });
});

describe("menu-items cart_btn_text", () => {
  test("Add To Quote in quote mode", () => {
    mockConfig.cart_mode = "quote";
    expect(eleventyComputed.cart_btn_text(menuItemData())).toBe("Add To Quote");
  });

  test("Add to Cart in stripe mode", () => {
    mockConfig.cart_mode = "stripe";
    expect(eleventyComputed.cart_btn_text(menuItemData())).toBe("Add to Cart");
  });
});

describe("menu-items cart_max_quantity and single-option flag", () => {
  test("cart_max_quantity falls back to config.default_max_quantity", () => {
    mockConfig.default_max_quantity = 10;
    expect(eleventyComputed.cart_max_quantity(menuItemData())).toBe(10);
  });

  test("cart_max_quantity honours a per-item override", () => {
    mockConfig.default_max_quantity = 10;
    expect(
      eleventyComputed.cart_max_quantity(menuItemData({ max_quantity: 4 })),
    ).toBe(4);
  });

  test("has_single_cart_option is always true", () => {
    expect(eleventyComputed.has_single_cart_option(menuItemData())).toBe(true);
  });
});

describe("menu-items show_cart_quantity_selector", () => {
  test("true when cart-enabled (stripe + safe price + sku)", () => {
    mockConfig.cart_mode = "stripe";
    expect(
      eleventyComputed.show_cart_quantity_selector(
        menuItemData({ sku: "ABC" }),
      ),
    ).toBe(true);
  });

  test("false when not cart-enabled (stripe + no sku)", () => {
    mockConfig.cart_mode = "stripe";
    expect(eleventyComputed.show_cart_quantity_selector(menuItemData())).toBe(
      false,
    );
  });

  test("false for an ambiguous price even with a sku", () => {
    mockConfig.cart_mode = "quote";
    expect(
      eleventyComputed.show_cart_quantity_selector(
        menuItemData({ sku: "ABC", price: "£10 / £12" }),
      ),
    ).toBe(false);
  });
});

describe("menu-items dietaryKeys", () => {
  test("returns empty when no dietaryIndicators are configured", () => {
    expect(eleventyComputed.dietaryKeys(menuItemData())).toEqual([]);
  });

  test("returns symbol and label only for indicators whose field is truthy", () => {
    const result = eleventyComputed.dietaryKeys(
      menuItemData({
        vegan: true,
        gluten_free: true,
        dairy_free: false,
        dietaryIndicators: {
          vegan: { field: "vegan", symbol: "🌱", label: "Vegan" },
          glutenFree: {
            field: "gluten_free",
            symbol: "🌾",
            label: "Gluten-Free",
          },
          dairyFree: {
            field: "dairy_free",
            symbol: "🥛",
            label: "Dairy-Free",
          },
        },
      }),
    );
    expect(result).toEqual([
      { symbol: "🌱", label: "Vegan" },
      { symbol: "🌾", label: "Gluten-Free" },
    ]);
  });
});

describe("menu-items menu_categories", () => {
  test("returns empty when no menu_categories are set", () => {
    expect(eleventyComputed.menu_categories(menuItemData())).toEqual([]);
  });

  test("normalises each PagesCMS reference to its filename slug", () => {
    const result = eleventyComputed.menu_categories(
      menuItemData({
        menu_categories: ["categories/lunch.md", "categories/hot-drinks.md"],
      }),
    );
    expect(result).toEqual(["lunch", "hot-drinks"]);
  });
});
