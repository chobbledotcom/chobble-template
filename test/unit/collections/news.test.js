import { describe, expect, test } from "bun:test";
import {
  allNewsHaveImages,
  configureNews,
  createNewsCollection,
} from "#collections/news.js";
import {
  collectionApi,
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

/** Create news posts from an array of [title, dateStr, options] tuples */
const newsPostItems = (tuples) =>
  tuples.map(([title, dateStr, options = {}]) => ({
    data: { title, ...options },
    date: new Date(dateStr),
  }));

describe("news-collection", () => {
  test("Creates collection excluding no_index posts", () => {
    const posts = newsPostItems([
      ["Post 1", "2024-01-01"],
      ["Post 2", "2024-01-02", { no_index: true }],
      ["Post 3", "2024-01-03"],
    ]);

    const result = createNewsCollection(collectionApi(posts));

    expectResultTitles(result, ["Post 3", "Post 1"]);
  });

  test("Sorts posts by date descending (newest first)", () => {
    const posts = newsPostItems([
      ["Oldest", "2024-01-01"],
      ["Middle", "2024-01-15"],
      ["Newest", "2024-01-30"],
    ]);

    const result = createNewsCollection(collectionApi(posts));

    expectResultTitles(result, ["Newest", "Middle", "Oldest"]);
  });

  test("Returns all posts when none have no_index", () => {
    const posts = newsPostItems([
      ["Post 1", "2024-01-01"],
      ["Post 2", "2024-01-02"],
      ["Post 3", "2024-01-03"],
    ]);

    const result = createNewsCollection(collectionApi(posts));

    expect(result.length).toBe(3);
  });

  test("Returns empty array when all posts have no_index", () => {
    const posts = newsPostItems([
      ["Post 1", "2024-01-01", { no_index: true }],
      ["Post 2", "2024-01-02", { no_index: true }],
    ]);

    const result = createNewsCollection(collectionApi(posts));

    expect(result.length).toBe(0);
  });

  test("Returns empty array when collection is empty", () => {
    const result = createNewsCollection(collectionApi([]));

    expect(result.length).toBe(0);
  });

  test("Treats no_index: false as visible", () => {
    const posts = newsPostItems([
      ["Hidden", "2024-01-01", { no_index: true }],
      ["Explicit false", "2024-01-02", { no_index: false }],
      ["No property", "2024-01-03"],
    ]);

    const result = createNewsCollection(collectionApi(posts));

    expectResultTitles(result, ["No property", "Explicit false"]);
  });

  test("Configures news collection on Eleventy config", () => {
    const mockConfig = createMockEleventyConfig();

    configureNews(mockConfig);

    expect(typeof mockConfig.collections.news).toBe("function");
  });

  test("Collection function is pure and does not modify inputs", () => {
    const posts = newsPostItems([
      ["Post 1", "2024-01-01"],
      ["Post 2", "2024-01-02", { no_index: true }],
    ]);
    const originalLength = posts.length;
    const originalFirst = { ...posts[0].data };

    createNewsCollection(collectionApi(posts));

    expect(posts.length).toBe(originalLength);
    expect(posts[0].data).toEqual(originalFirst);
  });

  describe("allNewsHaveImages", () => {
    test("returns true when all posts have header_image", () => {
      const posts = newsPostItems([
        ["Post 1", "2024-01-01", { header_image: "a.jpg" }],
        ["Post 2", "2024-01-02", { header_image: "b.jpg" }],
      ]);
      expect(allNewsHaveImages(posts)).toBe(true);
    });

    test("returns false when any post lacks header_image", () => {
      const posts = newsPostItems([
        ["Post 1", "2024-01-01", { header_image: "a.jpg" }],
        ["Post 2", "2024-01-02"],
      ]);
      expect(allNewsHaveImages(posts)).toBe(false);
    });

    test("returns false for empty array", () => {
      expect(allNewsHaveImages([])).toBe(false);
    });
  });
});
