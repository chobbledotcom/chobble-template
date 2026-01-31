import { describe, expect, test } from "bun:test";
import config from "#data/config.json" with { type: "json" };
import { configureFormatPrice } from "#eleventy/format-price.js";
import { createMockEleventyConfig } from "#test/test-utils.js";
import {
  formatPriceNumber,
  formatPriceWithSymbol,
} from "#utils/format-price.js";

describe("formatPriceNumber", () => {
  test.each([
    [3.5, "3.50"],
    [3.99, "3.99"],
    [149.99, "149.99"],
    [0.5, "0.50"],
    [10.1, "10.10"],
  ])("fractional price %p displays with two decimal places → %p", (input, expected) => {
    expect(formatPriceNumber(input)).toBe(expected);
  });

  test.each([
    [3, "3"],
    [10, "10"],
    [100.0, "100"],
    [1, "1"],
    [0, "0"],
  ])("whole number price %p displays without decimals → %p", (input, expected) => {
    expect(formatPriceNumber(input)).toBe(expected);
  });

  test("string with currency symbol is passed through unchanged", () => {
    expect(formatPriceNumber("£30")).toBe("£30");
    expect(formatPriceNumber("$30")).toBe("$30");
    expect(formatPriceNumber("€30")).toBe("€30");
  });

  test("non-numeric string is passed through unchanged", () => {
    expect(formatPriceNumber("free")).toBe("free");
  });

  test("numeric string is formatted like a number", () => {
    expect(formatPriceNumber("3.5")).toBe("3.50");
  });
});

describe("formatPriceWithSymbol", () => {
  test.each([
    [3.5, "£3.50"],
    [10, "£10"],
    [99.99, "£99.99"],
    [0.3, "£0.30"],
  ])("prepends currency symbol to formatted price %p → %p", (input, expected) => {
    expect(formatPriceWithSymbol("£", input)).toBe(expected);
  });

  test("works with different currency symbols", () => {
    expect(formatPriceWithSymbol("$", 9.99)).toBe("$9.99");
    expect(formatPriceWithSymbol("€", 5)).toBe("€5");
  });

  test("string with existing currency symbol is passed through", () => {
    expect(formatPriceWithSymbol("£", "£30")).toBe("£30");
  });
});

describe("configureFormatPrice", () => {
  test("registers format_price filter using config currency_symbol", () => {
    const mockConfig = createMockEleventyConfig();
    configureFormatPrice(mockConfig);

    const filter = mockConfig.filters.format_price;
    expect(filter(3.5)).toBe(`${config.currency_symbol}3.50`);
    expect(filter(10)).toBe(`${config.currency_symbol}10`);
  });

  test("registers format_price_number filter without symbol", () => {
    const mockConfig = createMockEleventyConfig();
    configureFormatPrice(mockConfig);

    const filter = mockConfig.filters.format_price_number;
    expect(filter(3.5)).toBe("3.50");
    expect(filter(10)).toBe("10");
  });
});
