import { describe, expect, test } from "bun:test";
import {
  createMockEleventyConfig,
  expectResultTitles,
  taggedCollectionApi,
} from "#test/test-utils.js";
import {
  configureCollectionUtils,
  createArrayFieldIndexer,
  createFieldIndexer,
  featuredCollection,
  getEventsFromApi,
  getLocationsFromApi,
} from "#utils/collection-utils.js";

describe("collection-utils", () => {
  describe("featuredCollection", () => {
    const createFakeCollection = (api) => api.getFilteredByTag("products");

    const getFeatured = featuredCollection(createFakeCollection);

    test("filters items by featured flag", () => {
      const products = [
        { data: { title: "Item 1", featured: true } },
        { data: { title: "Item 2", featured: false } },
        { data: { title: "Item 3", featured: true } },
      ];
      const result = getFeatured(taggedCollectionApi({ products }));
      expectResultTitles(result, ["Item 1", "Item 3"]);
    });

    test("returns empty array when no items are featured", () => {
      const products = [{ data: { title: "Item 1", featured: false } }];
      const result = getFeatured(taggedCollectionApi({ products }));
      expect(result).toHaveLength(0);
    });

    test("handles empty collection", () => {
      const result = getFeatured(taggedCollectionApi({ products: [] }));
      expect(result).toEqual([]);
    });
  });

  describe("configureCollectionUtils", () => {
    test("does not throw", () => {
      const mockConfig = createMockEleventyConfig();
      configureCollectionUtils(mockConfig);
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

  describe("createArrayFieldIndexer slug normalisation", () => {
    const indexByEvents = createArrayFieldIndexer("events");

    test.each([
      { format: "bare slug", value: "summer-sale" },
      { format: "path with .md", value: "events/summer-sale.md" },
      { format: "path without extension", value: "events/summer-sale" },
    ])("normalises $format to bare slug for lookup", ({ value }) => {
      const items = [{ data: { title: "P1", events: [value] } }];
      const index = indexByEvents(items);
      expect(index["summer-sale"]).toHaveLength(1);
      expect(index["summer-sale"][0].data.title).toBe("P1");
    });

    test("groups items with mixed slug formats under same key", () => {
      const items = [
        { data: { title: "P1", events: ["summer-sale"] } },
        { data: { title: "P2", events: ["events/summer-sale.md"] } },
        { data: { title: "P3", events: ["events/summer-sale"] } },
      ];
      const index = indexByEvents(items);
      expect(index["summer-sale"]).toHaveLength(3);
    });
  });

  describe("createFieldIndexer slug normalisation", () => {
    const indexByParent = createFieldIndexer("parent");

    test.each([
      { format: "bare slug", value: "widgets" },
      { format: "path with .md", value: "categories/widgets.md" },
      { format: "path without extension", value: "categories/widgets" },
    ])("normalises $format to bare slug for lookup", ({ value }) => {
      const items = [{ data: { title: "C1", parent: value } }];
      const index = indexByParent(items);
      expect(index.widgets).toHaveLength(1);
    });
  });
});
