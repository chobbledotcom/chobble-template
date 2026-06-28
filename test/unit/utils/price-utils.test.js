import { describe, expect, test } from "bun:test";
import { isAmbiguousPrice, parsePrice } from "#utils/price-utils.js";

describe("parsePrice", () => {
  test("passes numbers through unchanged", () => {
    expect(parsePrice(null)(15)).toBe(15);
    expect(parsePrice(0)(15.5)).toBe(15.5);
  });

  test("extracts the first numeric run from a price string", () => {
    expect(parsePrice(null)("£15.00")).toBe(15);
    expect(parsePrice(null)("£8.50")).toBe(8.5);
    expect(parsePrice(0)("from £8")).toBe(8);
  });

  test("returns the fallback for missing or unparseable input", () => {
    expect(parsePrice(null)(null)).toBe(null);
    expect(parsePrice(null)(undefined)).toBe(null);
    expect(parsePrice(null)("")).toBe(null);
    expect(parsePrice(null)("Free")).toBe(null);
    expect(parsePrice(0)("Free")).toBe(0);
  });
});

describe("isAmbiguousPrice", () => {
  test("true when a string contains more than one numeric amount", () => {
    expect(isAmbiguousPrice("£10 / £12")).toBe(true);
    expect(isAmbiguousPrice("from £8 to £14")).toBe(true);
    expect(isAmbiguousPrice("2 for £15")).toBe(true);
    expect(isAmbiguousPrice("£15.00 (was £20.00)")).toBe(true);
  });

  test("false for a single-amount price string", () => {
    expect(isAmbiguousPrice("£15.00")).toBe(false);
    expect(isAmbiguousPrice("£8")).toBe(false);
    expect(isAmbiguousPrice("15")).toBe(false);
  });

  test("false for non-string prices (handled by parsePrice, not ambiguity)", () => {
    expect(isAmbiguousPrice(15)).toBe(false);
    expect(isAmbiguousPrice(null)).toBe(false);
    expect(isAmbiguousPrice(undefined)).toBe(false);
  });
});
