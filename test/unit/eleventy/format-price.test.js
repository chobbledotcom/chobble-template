import { describe, expect, test } from "bun:test";
import { formatPrice } from "#eleventy/format-price.js";

describe("formatPrice", () => {
  test.each([
    [3.5, "3.50"],
    [3.99, "3.99"],
    [149.99, "149.99"],
    [0.5, "0.50"],
    [10.1, "10.10"],
  ])("fractional price %p displays with two decimal places → %p", (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });

  test.each([
    [3, "3"],
    [10, "10"],
    [100.0, "100"],
    [1, "1"],
    [0, "0"],
  ])("whole number price %p displays without decimals → %p", (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });

  test("string with £ sign is passed through unchanged", () => {
    expect(formatPrice("£30")).toBe("£30");
  });

  test("non-numeric string is passed through unchanged", () => {
    expect(formatPrice("free")).toBe("free");
  });

  test("numeric string is formatted like a number", () => {
    expect(formatPrice("3.5")).toBe("3.50");
  });
});
