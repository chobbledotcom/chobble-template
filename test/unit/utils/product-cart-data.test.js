import { describe, expect, test } from "bun:test";
import getConfig from "#data/config.js";
import {
  buildCartAttributes,
  computeOptions,
  getDefaultMaxQuantity,
} from "#utils/product-cart-data.js";

describe("product-cart-data", () => {
  describe("computeOptions", () => {
    test("returns empty array when no options", () => {
      expect(computeOptions({}, "buy")).toEqual([]);
      expect(computeOptions({ options: [] }, "buy")).toEqual([]);
    });

    test("preserves numeric unit_price values", () => {
      const options = [{ name: "Standard", unit_price: 49.99 }];
      const result = computeOptions({ options }, "buy");
      expect(result[0].unit_price).toBe(49.99);
    });

    test("normalizes nullable fields", () => {
      const options = [{ name: "Small", unit_price: 10 }];
      expect(computeOptions({ options }, "buy")).toEqual([
        {
          name: "Small",
          unit_price: 10,
          sku: null,
          days: null,
          max_quantity: null,
        },
      ]);
    });

    test("filters and sorts options for hire mode", () => {
      const data = {
        title: "Widget",
        options: [
          { days: 3, unit_price: 30 },
          { days: 1, unit_price: 10 },
          { name: "No days" }, // Should be filtered out
        ],
      };
      const result = computeOptions(data, "hire");
      expect(result).toEqual([
        { days: 1, unit_price: 10, sku: null, max_quantity: null },
        { days: 3, unit_price: 30, sku: null, max_quantity: null },
      ]);
    });

    test("does not validate hire options (validation happens in buildCartAttributes)", () => {
      const data = {
        title: "No Day One",
        options: [{ days: 3, unit_price: 30 }],
      };
      expect(() => computeOptions(data, "hire")).not.toThrow();
    });

    test("applies defaultMaxQuantity to options without max_quantity", () => {
      const options = [
        { name: "Small", unit_price: 10 },
        { name: "Large", unit_price: 20 },
      ];
      const result = computeOptions({ options }, "buy", 5);
      expect(result).toEqual([
        {
          name: "Small",
          unit_price: 10,
          max_quantity: 5,
          sku: null,
          days: null,
        },
        {
          name: "Large",
          unit_price: 20,
          max_quantity: 5,
          sku: null,
          days: null,
        },
      ]);
    });

    test("preserves existing max_quantity when defaultMaxQuantity provided", () => {
      const options = [
        { name: "Limited", unit_price: 10, max_quantity: 2 },
        { name: "Unlimited", unit_price: 20 },
      ];
      const result = computeOptions({ options }, "buy", 10);
      expect(result).toEqual([
        {
          name: "Limited",
          unit_price: 10,
          max_quantity: 2,
          sku: null,
          days: null,
        },
        {
          name: "Unlimited",
          unit_price: 20,
          max_quantity: 10,
          sku: null,
          days: null,
        },
      ]);
    });

    test("applies defaultMaxQuantity in hire mode", () => {
      const data = {
        title: "Widget",
        options: [
          { days: 1, unit_price: 10 },
          { days: 3, unit_price: 30, max_quantity: 3 },
        ],
      };
      const result = computeOptions(data, "hire", 5);
      expect(result).toEqual([
        { days: 1, unit_price: 10, max_quantity: 5, sku: null },
        { days: 3, unit_price: 30, max_quantity: 3, sku: null },
      ]);
    });
  });

  describe("buildCartAttributes", () => {
    test("returns null when no options", () => {
      const result = buildCartAttributes({
        name: "Empty Product",
        subtitle: "Sub",
        options: [],
        mode: "buy",
      });
      expect(result).toBeNull();
    });

    test("builds JSON with escaped quotes for buy mode", () => {
      const result = buildCartAttributes({
        name: "Widget",
        subtitle: "A widget",
        options: [{ name: "Standard", unit_price: 10, sku: "WDG-001" }],
        mode: "buy",
      });

      expect(result).toContain("&quot;");
      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.name).toBe("Widget");
      expect(parsed.options[0].unit_price).toBe(10);
    });

    test("builds hire_prices map for hire mode", () => {
      const result = buildCartAttributes({
        name: "Hire Item",
        subtitle: null,
        options: [
          { name: "1 Day", days: 1, unit_price: 10 },
          { name: "3 Days", days: 3, unit_price: 25 },
        ],
        mode: "hire",
      });

      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.hire_prices).toEqual({ 1: 10, 3: 25 });
      expect(parsed.product_mode).toBe("hire");
    });

    test("throws when hire options missing 1-day option", () => {
      expect(() =>
        buildCartAttributes({
          name: "Bad Hire",
          subtitle: null,
          options: [{ days: 3, unit_price: 30 }],
          mode: "hire",
        }),
      ).toThrow('Product "Bad Hire" is hire mode but has no 1-day option');
    });

    test("throws when hire options have duplicate days", () => {
      expect(() =>
        buildCartAttributes({
          name: "Dupe Hire",
          subtitle: null,
          options: [
            { days: 1, unit_price: 10 },
            { days: 3, unit_price: 25 },
            { days: 3, unit_price: 30 },
          ],
          mode: "hire",
        }),
      ).toThrow('Product "Dupe Hire" has duplicate options for days=3');
    });
  });

  describe("getDefaultMaxQuantity", () => {
    test("returns the item-level max_quantity override when set", () => {
      expect(getDefaultMaxQuantity({ max_quantity: 7 })).toBe(7);
    });

    test("returns explicit zero override when set", () => {
      expect(getDefaultMaxQuantity({ max_quantity: 0 })).toBe(0);
    });

    test("falls back when max_quantity is explicitly null", () => {
      expect(getDefaultMaxQuantity({ max_quantity: null })).toBe(
        getConfig().default_max_quantity,
      );
    });

    test("falls back to the configured default when max_quantity is not set", () => {
      expect(getDefaultMaxQuantity({})).toBe(getConfig().default_max_quantity);
    });
  });
});
