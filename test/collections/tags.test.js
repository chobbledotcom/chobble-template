import { describe, expect, test } from "bun:test";
import { configureTags, extractTags } from "#collections/tags.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("tags", () => {
  test("Extracts unique tags from collection", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["javascript", "web"] },
      },
      {
        url: "/post2/",
        data: { tags: ["javascript", "nodejs"] },
      },
      {
        url: "/post3/",
        data: { tags: ["web", "css"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(4);
    expect(result).toEqual(["css", "javascript", "nodejs", "web"]);
  });

  test("Handles empty collection", () => {
    const result = extractTags([]);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("Handles pages without tags", () => {
    const collection = [
      {
        url: "/page1/",
        data: {},
      },
      {
        url: "/page2/",
        data: { title: "Page 2" },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(0);
  });

  test("Handles null and undefined tags gracefully", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: null },
      },
      {
        url: "/post2/",
        data: { tags: undefined },
      },
      {
        url: "/post3/",
        data: { tags: ["javascript"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["javascript"]);
  });

  test("Filters out empty and whitespace-only tags", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["javascript", "", "  ", "web", "   \t  "] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(2);
    expect(result).toEqual(["javascript", "web"]);
  });

  test("Removes duplicate tags", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["javascript", "web"] },
      },
      {
        url: "/post2/",
        data: { tags: ["javascript", "web", "javascript"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(2);
    expect(result).toEqual(["javascript", "web"]);
  });

  test("Returns tags in sorted order", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["zebra", "apple", "banana"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toEqual(["apple", "banana", "zebra"]);
  });

  test("Filters out pages without URL", () => {
    const collection = [
      {
        data: { tags: ["hidden"] },
      },
      {
        url: "/visible/",
        data: { tags: ["visible"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["visible"]);
  });

  test("Filters out pages marked as no_index", () => {
    const collection = [
      {
        url: "/indexed/",
        data: { tags: ["indexed"] },
      },
      {
        url: "/not-indexed/",
        data: { tags: ["hidden"], no_index: true },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["indexed"]);
  });

  test("Handles mixed data scenarios", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["valid"] },
      },
      {
        url: "/post2/",
        data: { tags: ["another"], no_index: false },
      },
      {
        url: "/post3/",
        data: { tags: ["hidden"], no_index: true },
      },
      {
        // No data property
        url: "/post4/",
      },
      {
        data: { tags: ["no-url"] },
        // No url property
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(2);
    expect(result).toEqual(["another", "valid"]);
  });

  test("Properly flattens tag arrays", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["tag1", "tag2"] },
      },
      {
        url: "/post2/",
        data: { tags: ["tag3"] },
      },
      {
        url: "/post3/",
        data: { tags: [] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(3);
    expect(result).toEqual(["tag1", "tag2", "tag3"]);
  });

  test("Configures tags filter in Eleventy", () => {
    const mockConfig = createMockEleventyConfig();

    configureTags(mockConfig);

    expect(typeof mockConfig.filters.tags).toBe("function");
    expect(mockConfig.filters.tags).toBe(extractTags);
  });

  test("Configured filter works correctly", () => {
    const mockConfig = createMockEleventyConfig();
    configureTags(mockConfig);

    const collection = [
      {
        url: "/test/",
        data: { tags: ["test-tag"] },
      },
    ];

    const result = mockConfig.filters.tags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["test-tag"]);
  });

  test("Function does not modify input collection", () => {
    const originalCollection = [
      {
        url: "/post1/",
        data: { tags: ["original"], title: "Test" },
      },
    ];

    const collectionCopy = JSON.parse(JSON.stringify(originalCollection));

    extractTags(collectionCopy);

    expect(collectionCopy).toEqual(originalCollection);
  });

  test("Handles various edge cases including numbers", () => {
    const collection = [
      {
        url: "/post1/",
        data: { tags: ["  spaced  ", "normal"] },
      },
      {
        url: "/post2/",
        data: { tags: [123, 0, "text"] },
      },
      {
        url: "/post3/",
        data: { tags: ["", null, undefined, "valid"] },
      },
    ];

    const result = extractTags(collection);

    expect(result).toEqual(["0", "123", "normal", "spaced", "text", "valid"]);
    expect(result.every((tag) => typeof tag === "string")).toBe(true);
  });
});
