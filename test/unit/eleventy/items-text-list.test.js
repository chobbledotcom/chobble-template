import { describe, expect, test } from "bun:test";
import { configureItemsTextList } from "#eleventy/items-text-list.js";
import { createMockEleventyConfig, expectProp } from "#test/test-utils.js";

const expectNames = expectProp("name");
const expectSeparators = expectProp("separator");

const createItem = (title, url) => ({
  url,
  data: { title },
});

const THREE_ITEMS = [
  createItem("Alpha", "/alpha/"),
  createItem("Beta", "/beta/"),
  createItem("Gamma", "/gamma/"),
];

const getItemsTextListFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureItemsTextList(mockConfig);
  return mockConfig.filters.prepareItemsTextList;
};

describe("items-text-list", () => {
  test("Registers prepareItemsTextList filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureItemsTextList(mockConfig);
    expect(typeof mockConfig.filters.prepareItemsTextList).toBe("function");
  });

  test("Returns empty array for null collection", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    expect(prepareItemsTextList(null, "/page/")).toEqual([]);
  });

  test("Returns empty array for empty collection", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    expect(prepareItemsTextList([], "/page/")).toEqual([]);
  });

  test("Returns empty array when only item is current page", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const items = [createItem("Alpha", "/alpha/")];
    expect(prepareItemsTextList(items, "/alpha/")).toEqual([]);
  });

  test("Excludes current page from results", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const result = prepareItemsTextList(THREE_ITEMS, "/alpha/");
    expect(result).toHaveLength(2);
    expect(result.some((i) => i.url === "/alpha/")).toBe(false);
  });

  test("Single result has empty separator", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const items = [
      createItem("Alpha", "/alpha/"),
      createItem("Beta", "/beta/"),
    ];
    const result = prepareItemsTextList(items, "/alpha/");
    expect(result).toHaveLength(1);
    expect(result[0].separator).toBe("");
  });

  test("Two results use 'and' separator before last", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const result = prepareItemsTextList(THREE_ITEMS, "/alpha/");
    expectSeparators(result, [" and ", ""]);
  });

  test("Three results use comma then 'and' separators", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const items = [
      ...THREE_ITEMS,
      createItem("Delta", "/delta/"),
    ];
    const result = prepareItemsTextList(items, "/alpha/");
    expectSeparators(result, [", ", " and ", ""]);
  });

  test("Sorts results alphabetically by title", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const items = [
      createItem("Zebra", "/zebra/"),
      createItem("Alpha", "/alpha/"),
      createItem("Metro", "/metro/"),
    ];
    const result = prepareItemsTextList(items, "/other/");
    expectNames(result, ["Alpha", "Metro", "Zebra"]);
  });

  test("Result items include url and name from title", () => {
    const prepareItemsTextList = getItemsTextListFilter();
    const items = [createItem("Alpha", "/alpha/")];
    const result = prepareItemsTextList(items, "/other/");
    expect(result[0].url).toBe("/alpha/");
    expect(result[0].name).toBe("Alpha");
  });
});
