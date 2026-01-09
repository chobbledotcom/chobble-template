import { describe, expect, test } from "bun:test";
import { validateHireOptions } from "#utils/product-validation.js";

describe("product-validation", () => {
  describe("validateHireOptions", () => {
    test("passes valid options with 1-day option", () => {
      const options = [
        { days: 1, unit_price: 10 },
        { days: 3, unit_price: 25 },
        { days: 7, unit_price: 50 },
      ];
      expect(() => validateHireOptions(options, "Test Product")).not.toThrow();
    });

    test("throws on duplicate days", () => {
      const options = [
        { days: 1, unit_price: 10 },
        { days: 3, unit_price: 25 },
        { days: 3, unit_price: 30 },
      ];
      expect(() => validateHireOptions(options, "Test Product")).toThrow(
        'Product "Test Product" has duplicate options for days=3',
      );
    });

    test("throws when missing 1-day option", () => {
      const options = [
        { days: 3, unit_price: 25 },
        { days: 7, unit_price: 50 },
      ];
      expect(() => validateHireOptions(options, "Test Product")).toThrow(
        'Product "Test Product" is hire mode but has no 1-day option',
      );
    });

    test("throws with correct product title in error message", () => {
      const options = [{ days: 2, unit_price: 20 }];
      expect(() => validateHireOptions(options, "My Custom Product")).toThrow(
        'Product "My Custom Product" is hire mode but has no 1-day option',
      );
    });
  });
});
