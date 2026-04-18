import { describe, expect, test } from "bun:test";
import {
  buildFilterHash,
  parseFiltersFromHash,
} from "#public/ui/category-filter-url.js";

describe("buildFilterHash", () => {
  test("builds hash with filters", () => {
    const hash = buildFilterHash({ colour: "red" }, "default");
    expect(hash).toBe("#colour/red");
  });

  test("builds hash with multiple filters in alphabetical key order", () => {
    const hash = buildFilterHash({ size: "large", colour: "red" }, "default");
    expect(hash).toBe("#colour/red/size/large");
  });

  test("builds hash with sort key only", () => {
    const hash = buildFilterHash({}, "price-asc");
    expect(hash).toBe("#price-asc");
  });

  test("builds hash with filters and sort key", () => {
    const hash = buildFilterHash({ colour: "red" }, "name-desc");
    expect(hash).toBe("#colour/red/name-desc");
  });

  test("returns empty string when no filters and default sort", () => {
    const hash = buildFilterHash({}, "default");
    expect(hash).toBe("");
  });

  test("encodes special characters in filter keys and values", () => {
    const hash = buildFilterHash({ "pet-friendly": "yes" }, "default");
    expect(hash).toBe("#pet-friendly/yes");
  });
});

describe("parseFiltersFromHash", () => {
  test("parses filters from hash", () => {
    const result = parseFiltersFromHash("#colour/red");
    expect(result).toEqual({ filters: { colour: "red" }, sortKey: "default" });
  });

  test("parses multiple filters from hash", () => {
    const result = parseFiltersFromHash("#colour/red/size/large");
    expect(result).toEqual({
      filters: { colour: "red", size: "large" },
      sortKey: "default",
    });
  });

  test("parses sort key from hash", () => {
    const result = parseFiltersFromHash("#price-asc");
    expect(result).toEqual({ filters: {}, sortKey: "price-asc" });
  });

  test("parses filters and sort key together", () => {
    const result = parseFiltersFromHash("#colour/red/name-desc");
    expect(result).toEqual({
      filters: { colour: "red" },
      sortKey: "name-desc",
    });
  });

  test("returns empty state for empty hash", () => {
    const result = parseFiltersFromHash("");
    expect(result).toEqual({ filters: {}, sortKey: "default" });
  });

  test("returns empty state for bare hash", () => {
    const result = parseFiltersFromHash("#");
    expect(result).toEqual({ filters: {}, sortKey: "default" });
  });

  test("decodes URI-encoded keys and values", () => {
    const result = parseFiltersFromHash("#pet-friendly/yes");
    expect(result).toEqual({
      filters: { "pet-friendly": "yes" },
      sortKey: "default",
    });
  });

  test("round-trips with buildFilterHash", () => {
    const filters = { colour: "red", size: "large" };
    const sortKey = "price-asc";
    const hash = buildFilterHash(filters, sortKey);
    const parsed = parseFiltersFromHash(hash);
    expect(parsed).toEqual({ filters, sortKey });
  });

  test("handles encoded special characters round-trip", () => {
    const filters = { "pet-friendly": "yes" };
    const hash = buildFilterHash(filters, "default");
    const parsed = parseFiltersFromHash(hash);
    expect(parsed.filters).toEqual(filters);
  });
});
