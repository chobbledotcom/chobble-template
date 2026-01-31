import { describe, expect, test } from "bun:test";
import {
  buildCartAttributes,
  computeOptions,
} from "#utils/product-cart-data.js";

const UNPARSEABLE_OPTION = {
  name: "Free",
  unit_price: "free",
  numeric_price: null,
  sku: null,
  days: null,
  max_quantity: null,
};

describe("product-cart-data", () => {
  describe("computeOptions", () => {
    test("returns empty array when no options", () => {
      expect(computeOptions({}, "buy")).toEqual([]);
      expect(computeOptions({ options: [] }, "buy")).toEqual([]);
    });

    test("returns options with normalized nullable fields and numeric_price for non-hire mode", () => {
      const options = [{ name: "Small", unit_price: "£10" }];
      expect(computeOptions({ options }, "buy")).toEqual([
        {
          name: "Small",
          unit_price: "£10",
          numeric_price: 10,
          sku: null,
          days: null,
          max_quantity: null,
        },
      ]);
    });

    test("sets numeric_price to null for unparseable prices", () => {
      const options = [{ name: "Free", unit_price: "free" }];
      const result = computeOptions({ options }, "buy");
      expect(result[0].numeric_price).toBeNull();
    });

    test("parses numeric unit_price values", () => {
      const options = [{ name: "Standard", unit_price: 49.99 }];
      const result = computeOptions({ options }, "buy");
      expect(result[0].numeric_price).toBe(49.99);
    });

    test("filters, parses and sorts options for hire mode", () => {
      const data = {
        title: "Widget",
        options: [
          { days: 3, unit_price: "£30" },
          { days: 1, unit_price: "£10" },
          { name: "No days" }, // Should be filtered out
        ],
      };
      const result = computeOptions(data, "hire");
      expect(result).toEqual([
        {
          days: 1,
          unit_price: 10,
          numeric_price: 10,
          sku: null,
          max_quantity: null,
        },
        {
          days: 3,
          unit_price: 30,
          numeric_price: 30,
          sku: null,
          max_quantity: null,
        },
      ]);
    });

    test("throws on invalid price in hire mode", () => {
      const data = {
        title: "Widget",
        options: [{ days: 1, unit_price: "free" }],
      };
      expect(() => computeOptions(data, "hire")).toThrow(
        'Cannot parse price "free"',
      );
    });

    test("does not validate hire options (validation happens in buildCartAttributes)", () => {
      const data = {
        title: "No Day One",
        options: [{ days: 3, unit_price: "£30" }],
      };
      // Should not throw - validation only happens when building cart attributes
      expect(() => computeOptions(data, "hire")).not.toThrow();
    });

    test("applies defaultMaxQuantity to options without max_quantity", () => {
      const options = [
        { name: "Small", unit_price: "£10" },
        { name: "Large", unit_price: "£20" },
      ];
      const result = computeOptions({ options }, "buy", 5);
      expect(result).toEqual([
        {
          name: "Small",
          unit_price: "£10",
          numeric_price: 10,
          max_quantity: 5,
          sku: null,
          days: null,
        },
        {
          name: "Large",
          unit_price: "£20",
          numeric_price: 20,
          max_quantity: 5,
          sku: null,
          days: null,
        },
      ]);
    });

    test("preserves existing max_quantity when defaultMaxQuantity provided", () => {
      const options = [
        { name: "Limited", unit_price: "£10", max_quantity: 2 },
        { name: "Unlimited", unit_price: "£20" },
      ];
      const result = computeOptions({ options }, "buy", 10);
      expect(result).toEqual([
        {
          name: "Limited",
          unit_price: "£10",
          numeric_price: 10,
          max_quantity: 2,
          sku: null,
          days: null,
        },
        {
          name: "Unlimited",
          unit_price: "£20",
          numeric_price: 20,
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
          { days: 1, unit_price: "£10" },
          { days: 3, unit_price: "£30", max_quantity: 3 },
        ],
      };
      const result = computeOptions(data, "hire", 5);
      expect(result).toEqual([
        {
          days: 1,
          unit_price: 10,
          numeric_price: 10,
          max_quantity: 5,
          sku: null,
        },
        {
          days: 3,
          unit_price: 30,
          numeric_price: 30,
          max_quantity: 3,
          sku: null,
        },
      ]);
    });
  });

  describe("buildCartAttributes", () => {
    test("returns null when no options", () => {
      const result = buildCartAttributes({
        title: "Test",
        subtitle: "Sub",
        options: [],
        specs: null,
        mode: "buy",
      });
      expect(result).toBeNull();
    });

    test("returns null when no options have a numeric_price", () => {
      const result = buildCartAttributes({
        title: "Test",
        subtitle: "Sub",
        options: [UNPARSEABLE_OPTION],
        specs: null,
        mode: "buy",
      });
      expect(result).toBeNull();
    });

    test("builds JSON with escaped quotes for buy mode", () => {
      const result = buildCartAttributes({
        title: "Widget",
        subtitle: "A widget",
        options: [
          {
            name: "Standard",
            unit_price: "£10",
            numeric_price: 10,
            sku: "WDG-001",
          },
        ],
        specs: [{ name: "Color", value: "Red" }],
        mode: "buy",
      });

      expect(result).toContain("&quot;");
      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.name).toBe("Widget");
      expect(parsed.options[0].unit_price).toBe(10);
      expect(parsed.specs[0]).toEqual({ name: "Color", value: "Red" });
    });

    test("builds hire_prices map for hire mode", () => {
      const result = buildCartAttributes({
        title: "Hire Item",
        subtitle: null,
        options: [
          { name: "1 Day", days: 1, unit_price: 10, numeric_price: 10 },
          { name: "3 Days", days: 3, unit_price: 25, numeric_price: 25 },
        ],
        specs: null,
        mode: "hire",
      });

      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.hire_prices).toEqual({ 1: 10, 3: 25 });
      expect(parsed.product_mode).toBe("hire");
    });

    test("throws when hire options missing 1-day option", () => {
      expect(() =>
        buildCartAttributes({
          title: "Bad Hire",
          subtitle: null,
          options: [{ days: 3, unit_price: 30, numeric_price: 30 }],
          specs: null,
          mode: "hire",
        }),
      ).toThrow('Product "Bad Hire" is hire mode but has no 1-day option');
    });

    test("throws when hire options have duplicate days", () => {
      expect(() =>
        buildCartAttributes({
          title: "Dupe Hire",
          subtitle: null,
          options: [
            { days: 1, unit_price: 10, numeric_price: 10 },
            { days: 3, unit_price: 25, numeric_price: 25 },
            { days: 3, unit_price: 30, numeric_price: 30 },
          ],
          specs: null,
          mode: "hire",
        }),
      ).toThrow('Product "Dupe Hire" has duplicate options for days=3');
    });

    test("filters out options without numeric_price", () => {
      const result = buildCartAttributes({
        title: "Mixed",
        subtitle: null,
        options: [
          {
            name: "Priced",
            unit_price: "£10",
            numeric_price: 10,
            sku: "A",
            days: null,
            max_quantity: null,
          },
          UNPARSEABLE_OPTION,
        ],
        specs: null,
        mode: "buy",
      });

      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.options.length).toBe(1);
      expect(parsed.options[0].name).toBe("Priced");
    });
  });
});
