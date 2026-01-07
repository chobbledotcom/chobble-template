import { describe, expect, test } from "bun:test";
import { configureTags, extractTags } from "#collections/tags.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

const createCollectionItem = (url, tags) => ({ url, data: { tags } });

// Helper to test tag extraction with length and value checks
const testTagExtraction = (collection, expectedLength, expectedTags) => {
  const result = extractTags(collection);
  expect(result).toHaveLength(expectedLength);
  expect(result).toEqual(expectedTags);
};

describe("tags", () => {
  test("Extracts unique tags from collection", () => {
    const collection = [
      createCollectionItem("/post1/", ["javascript", "web"]),
      createCollectionItem("/post2/", ["javascript", "nodejs"]),
      createCollectionItem("/post3/", ["web", "css"]),
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
      { url: "/post1/", data: { tags: null } },
      { url: "/post2/", data: { tags: undefined } },
      createCollectionItem("/post3/", ["javascript"]),
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["javascript"]);
  });

  test("Filters out empty and whitespace-only tags", () => {
    const collection = [
      createCollectionItem("/post1/", [
        "javascript",
        "",
        "  ",
        "web",
        "   \t  ",
      ]),
    ];

    testTagExtraction(collection, 2, ["javascript", "web"]);
  });

  test("Removes duplicate tags", () => {
    const collection = [
      createCollectionItem("/post1/", ["javascript", "web"]),
      createCollectionItem("/post2/", ["javascript", "web", "javascript"]),
    ];

    testTagExtraction(collection, 2, ["javascript", "web"]);
  });

  test("Returns tags in sorted order", () => {
    const collection = [
      createCollectionItem("/post1/", ["zebra", "apple", "banana"]),
    ];

    const result = extractTags(collection);

    expect(result).toEqual(["apple", "banana", "zebra"]);
  });

  test("Filters out pages without URL", () => {
    const collection = [
      {
        data: { tags: ["hidden"] },
      },
      createCollectionItem("/visible/", ["visible"]),
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["visible"]);
  });

  test("Filters out pages marked as no_index", () => {
    const collection = [
      createCollectionItem("/indexed/", ["indexed"]),
      { url: "/not-indexed/", data: { tags: ["hidden"], no_index: true } },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["indexed"]);
  });

  test("Handles mixed data scenarios", () => {
    const collection = [
      createCollectionItem("/post1/", ["valid"]),
      { url: "/post2/", data: { tags: ["another"], no_index: false } },
      { url: "/post3/", data: { tags: ["hidden"], no_index: true } },
      { url: "/post4/" },
      { data: { tags: ["no-url"] } },
    ];

    const result = extractTags(collection);

    expect(result).toHaveLength(2);
    expect(result).toEqual(["another", "valid"]);
  });

  test("Properly flattens tag arrays", () => {
    const collection = [
      createCollectionItem("/post1/", ["tag1", "tag2"]),
      createCollectionItem("/post2/", ["tag3"]),
      createCollectionItem("/post3/", []),
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
      createCollectionItem("/post1/", ["  spaced  ", "normal"]),
      createCollectionItem("/post2/", [123, 0, "text"]),
      createCollectionItem("/post3/", ["", null, undefined, "valid"]),
    ];

    const result = extractTags(collection);

    expect(result).toEqual(["0", "123", "normal", "spaced", "text", "valid"]);
    expect(result.every((tag) => typeof tag === "string")).toBe(true);
  });
});
