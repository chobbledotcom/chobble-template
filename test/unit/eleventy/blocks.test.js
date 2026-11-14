import { describe, expect, test } from "vitest";
import { configureBlocks } from "#eleventy/blocks.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

const configuredFilters = () => {
  const mockConfig = createMockEleventyConfig();
  configureBlocks(mockConfig);
  return mockConfig.filters;
};

describe("configureBlocks", () => {
  test("registers the block rendering filters", () => {
    const filters = configuredFilters();
    for (const name of [
      "blockContainerWidth",
      "blockTemplate",
      "splitBlocksForColumns",
      "validatePageBodyContent",
      "splitHoistedBanner",
    ]) {
      expect(typeof filters[name]).toBe("function");
    }
  });
});

describe("validatePageBodyContent", () => {
  const bodyContentFilter = () => configuredFilters().validatePageBodyContent;

  test("passes through content from intermediate layouts", () => {
    expect(
      bodyContentFilter()("<p>Hi</p>", "news.html", "./src/news/a.md"),
    ).toBe("<p>Hi</p>");
  });

  test("returns empty string for base layout pages without body content", () => {
    expect(bodyContentFilter()("  \n ", "base.html", "./src/pages/a.md")).toBe(
      "",
    );
    expect(bodyContentFilter()("", "base", "./src/pages/a.md")).toBe("");
  });

  test("throws for base layout pages with body content", () => {
    expect(() =>
      bodyContentFilter()("stray text", "base.html", "./src/pages/a.md"),
    ).toThrow("./src/pages/a.md: uses base.html but has body content");
  });

  test("throws for the base layout alias too", () => {
    expect(() =>
      bodyContentFilter()("stray text", "base", "./src/pages/a.md"),
    ).toThrow("must express all content as blocks");
  });
});

describe("splitBlocksForColumns filter", () => {
  test("routes blocks through the tag-matched column layout", () => {
    const filter = configuredFilters().splitBlocksForColumns;
    const blocks = [{ type: "markdown" }, { type: "gallery" }];
    const layouts = { pages: { columns: [{ types: ["gallery"] }] } };

    const result = filter(blocks, ["pages"], layouts);

    expect(result.columns).toEqual([[{ type: "gallery" }]]);
    expect(result.rest).toEqual([{ type: "markdown" }]);
  });

  test("returns everything as rest when no layout matches the tags", () => {
    const filter = configuredFilters().splitBlocksForColumns;
    const blocks = [{ type: "markdown" }];

    const result = filter(blocks, ["news"], {});

    expect(result).toEqual({ before: [], columns: null, rest: blocks });
  });
});
