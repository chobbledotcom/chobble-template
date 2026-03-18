import { describe, expect, test } from "bun:test";
import { filterItems } from "#utils/collection-filter.js";

const makeItems = (...urls) =>
  urls.map((url) => ({ url, data: { title: `Page ${url}` } }));

describe("filterItems", () => {
  test("returns all items when filterConfig is falsy", () => {
    const items = makeItems("/a/", "/b/");
    expect(filterItems(items, null)).toEqual(items);
    expect(filterItems(items, undefined)).toEqual(items);
  });

  test("filters by url includes", () => {
    const items = makeItems(
      "/products/shoes/",
      "/products/hats/",
      "/news/update/",
    );
    const result = filterItems(items, {
      property: "url",
      includes: "/products/",
    });
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe("/products/shoes/");
    expect(result[1].url).toBe("/products/hats/");
  });

  test("filters by url equals", () => {
    const items = makeItems("/about/", "/about/team/");
    const result = filterItems(items, {
      property: "url",
      equals: "/about/",
    });
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("/about/");
  });

  test("filters by nested property using dot notation", () => {
    const items = [
      { url: "/a/", data: { title: "Hello World" } },
      { url: "/b/", data: { title: "Goodbye" } },
    ];
    const result = filterItems(items, {
      property: "data.title",
      includes: "Hello",
    });
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("/a/");
  });

  test("excludes items where property is undefined", () => {
    const items = [
      { url: "/a/", data: { title: "Test" } },
      { url: "/b/", data: {} },
    ];
    const result = filterItems(items, {
      property: "data.title",
      includes: "Test",
    });
    expect(result).toHaveLength(1);
  });

  test("coerces non-string values to string for comparison", () => {
    const items = [
      { url: "/a/", data: { order: 42 } },
      { url: "/b/", data: { order: 99 } },
    ];
    const result = filterItems(items, {
      property: "data.order",
      equals: "42",
    });
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("/a/");
  });

  test("throws when property is missing", () => {
    expect(() => filterItems([], { includes: "/foo/" })).toThrow('"property"');
  });

  test("throws when no operator is provided", () => {
    expect(() => filterItems([], { property: "url" })).toThrow("operator");
  });

  test("returns empty array when no items match", () => {
    const items = makeItems("/a/", "/b/");
    const result = filterItems(items, {
      property: "url",
      includes: "/nonexistent/",
    });
    expect(result).toEqual([]);
  });
});
