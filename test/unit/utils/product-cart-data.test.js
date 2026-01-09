import { describe, expect, test } from "bun:test";
import {
  buildCartAttributes,
  computeOptions,
} from "#utils/product-cart-data.js";

describe("product-cart-data", () => {
  describe("computeOptions", () => {
    test("returns empty array when no options", () => {
      expect(computeOptions({}, "buy")).toEqual([]);
      expect(computeOptions({ options: [] }, "buy")).toEqual([]);
    });

    test("returns options unchanged for non-hire mode", () => {
      const options = [{ name: "Small", unit_price: "£10" }];
      expect(computeOptions({ options }, "buy")).toBe(options);
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
        { days: 1, unit_price: 10 },
        { days: 3, unit_price: 30 },
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

    test("throws when hire options missing 1-day option", () => {
      const data = {
        title: "Bad Hire",
        options: [{ days: 3, unit_price: "£30" }],
      };
      expect(() => computeOptions(data, "hire")).toThrow(
        'Product "Bad Hire" is hire mode but has no 1-day option',
      );
    });

    test("throws when hire options have duplicate days", () => {
      const data = {
        title: "Dupe Hire",
        options: [
          { days: 1, unit_price: "£10" },
          { days: 3, unit_price: "£25" },
          { days: 3, unit_price: "£30" },
        ],
      };
      expect(() => computeOptions(data, "hire")).toThrow(
        'Product "Dupe Hire" has duplicate options for days=3',
      );
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

    test("builds JSON with escaped quotes for buy mode", () => {
      const result = buildCartAttributes({
        title: "Widget",
        subtitle: "A widget",
        options: [{ name: "Standard", unit_price: "£10", sku: "WDG-001" }],
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
          { name: "1 Day", days: 1, unit_price: 10 },
          { name: "3 Days", days: 3, unit_price: 25 },
        ],
        specs: null,
        mode: "hire",
      });

      const parsed = JSON.parse(result.replace(/&quot;/g, '"'));
      expect(parsed.hire_prices).toEqual({ 1: 10, 3: 25 });
      expect(parsed.product_mode).toBe("hire");
    });
  });
});
