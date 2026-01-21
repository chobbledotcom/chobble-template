import { describe, expect, test } from "bun:test";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
  taggedCollectionApi,
} from "#test/test-utils.js";
import {
  configureCollectionUtils,
  getEventsFromApi,
  getFeatured,
  getLocationsFromApi,
} from "#utils/collection-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Generic item factory with title and featured flag */
const item = data({})("title", "featured");

describe("collection-utils", () => {
  describe("getFeatured", () => {
    test("filters items by featured flag", () => {
      const items = item(
        ["Item 1", true],
        ["Item 2", false],
        ["Item 3", true],
        ["Item 4", undefined],
      );

      const result = getFeatured(items);

      expectResultTitles(result, ["Item 1", "Item 3"]);
    });

    test("returns empty array when no items are featured", () => {
      const items = item(["Item 1", false], ["Item 2", undefined]);

      const result = getFeatured(items);

      expect(result.length).toBe(0);
    });

    test("returns all items when all are featured", () => {
      const items = item(["Item 1", true], ["Item 2", true]);

      const result = getFeatured(items);

      expectResultTitles(result, ["Item 1", "Item 2"]);
    });

    test("handles empty array", () => {
      const result = getFeatured([]);

      expect(result).toEqual([]);
    });
  });

  describe("configureCollectionUtils", () => {
    test("registers getFeatured filter with Eleventy", () => {
      const mockConfig = createMockEleventyConfig();

      configureCollectionUtils(mockConfig);

      expect(typeof mockConfig.filters.getFeatured).toBe("function");
      expect(mockConfig.filters.getFeatured).toBe(getFeatured);
    });
  });

  describe("getEventsFromApi", () => {
    test("returns events from collection API", () => {
      const events = [
        { data: { title: "Event 1" } },
        { data: { title: "Event 2" } },
      ];
      const api = taggedCollectionApi({ events });

      const result = getEventsFromApi(api);

      expect(result).toEqual(events);
    });

    test("returns empty array when no events", () => {
      const api = taggedCollectionApi({ events: [] });

      const result = getEventsFromApi(api);

      expect(result).toEqual([]);
    });
  });

  describe("getLocationsFromApi", () => {
    test("returns locations from collection API", () => {
      const locations = [{ data: { title: "Location 1" } }];
      const api = taggedCollectionApi({ locations });

      const result = getLocationsFromApi(api);

      expect(result).toEqual(locations);
    });

    test("returns empty array when no locations", () => {
      const api = taggedCollectionApi({ locations: [] });

      const result = getLocationsFromApi(api);

      expect(result).toEqual([]);
    });
  });
});
