import { describe, expect, test } from "bun:test";
import { formatPrice } from "#utils/format-price.js";

describe("formatPrice", () => {
  test("formats whole-number prices without decimals", () => {
    expect(formatPrice("GBP", 30)).toBe("£30");
  });

  test("formats fractional prices with two decimals", () => {
    expect(formatPrice("GBP", 3.5)).toBe("£3.50");
    expect(formatPrice("GBP", 49.99)).toBe("£49.99");
  });

  test("accepts numeric strings from template engines", () => {
    expect(formatPrice("GBP", "5.00")).toBe("£5");
    expect(formatPrice("GBP", "49.99")).toBe("£49.99");
  });

  test("throws on non-numeric string values", () => {
    expect(() => formatPrice("GBP", "£30")).toThrow("Invalid price value");
    expect(() => formatPrice("GBP", "free")).toThrow("Invalid price value");
  });

  test("throws on NaN", () => {
    expect(() => formatPrice("GBP", NaN)).toThrow("Invalid price value");
  });

  test("throws on undefined", () => {
    expect(() => formatPrice("GBP", undefined)).toThrow("Invalid price value");
  });
});
