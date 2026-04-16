import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.pagefind_body", () => {
  test("returns true when a page tag appears in config.search_collections", () => {
    expect(
      eleventyComputed.pagefind_body({
        tags: ["products"],
        config: { search_collections: ["products", "categories"] },
      }),
    ).toBe(true);
  });

  test("returns false when no page tags match search_collections", () => {
    expect(
      eleventyComputed.pagefind_body({
        tags: ["pages"],
        config: { search_collections: ["products", "categories"] },
      }),
    ).toBe(false);
  });

  test("returns false when search_collections is missing from config", () => {
    expect(
      eleventyComputed.pagefind_body({ tags: ["products"], config: {} }),
    ).toBe(false);
  });

  test("returns false when the page has no tags", () => {
    expect(
      eleventyComputed.pagefind_body({
        config: { search_collections: ["products"] },
      }),
    ).toBe(false);
  });
});

describe("eleventyComputed.eleventyNavigation", () => {
  test("returns the navigation object unchanged when no anchor is configured", () => {
    const nav = { key: "Test", parent: "Parent" };
    expect(
      eleventyComputed.eleventyNavigation({ eleventyNavigation: nav }),
    ).toEqual(nav);
  });

  test("returns undefined when eleventyNavigation is not set", () => {
    expect(eleventyComputed.eleventyNavigation({})).toBeUndefined();
  });
});

describe("eleventyComputed.filter_attributes", () => {
  const page = { inputPath: "/products/test.md" };

  test("returns an empty array when filter_attributes is not set", () => {
    expect(eleventyComputed.filter_attributes({ page })).toEqual([]);
  });

  test("passes filter_attributes through unchanged in normal build mode", () => {
    const filterAttrs = [
      { name: "Color", value: "Red" },
      { name: "Size", value: "Large" },
    ];
    expect(
      eleventyComputed.filter_attributes({
        filter_attributes: filterAttrs,
        page,
      }),
    ).toBe(filterAttrs);
  });
});
