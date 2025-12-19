import { configureFeed } from "#eleventy/feed.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const testCases = [
  {
    name: "configureFeed-loads-html-base-plugin",
    description: "Loads HTML Base plugin for URL transformations",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      // Should load the HTML Base plugin
      expectTrue(
        mockConfig.pluginCalls.length >= 1,
        "Should call addPlugin at least once",
      );
    },
  },
  {
    name: "configureFeed-adds-filters",
    description: "Configures RSS date filters with eleventy config",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      // Should add the RSS date filters
      expectTrue(
        mockConfig.filters.dateToRfc3339 !== undefined,
        "Should add dateToRfc3339 filter",
      );
      expectTrue(
        mockConfig.filters.dateToRfc822 !== undefined,
        "Should add dateToRfc822 filter",
      );
      expectTrue(
        mockConfig.filters.getNewestCollectionItemDate !== undefined,
        "Should add getNewestCollectionItemDate filter",
      );
      expectTrue(
        mockConfig.filters.absoluteUrl !== undefined,
        "Should add absoluteUrl filter",
      );
    },
  },
  {
    name: "configureFeed-dateToRfc3339-filter",
    description: "dateToRfc3339 filter formats dates correctly",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      const dateFilter = mockConfig.filters.dateToRfc3339;
      const testDate = new Date("2024-01-15T12:30:00Z");
      const result = dateFilter(testDate);

      expectStrictEqual(
        result,
        "2024-01-15T12:30:00Z",
        "Should format date to RFC3339",
      );
    },
  },
  {
    name: "configureFeed-dateToRfc822-filter",
    description: "dateToRfc822 filter formats dates correctly",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      const dateFilter = mockConfig.filters.dateToRfc822;
      const testDate = new Date("2024-01-15T12:30:00Z");
      const result = dateFilter(testDate);

      // RFC822 format: Mon, 15 Jan 2024 12:30:00 +0000
      expectTrue(
        result.includes("15 Jan 2024"),
        "Should format date to RFC822",
      );
      expectTrue(
        result.includes("12:30:00"),
        "Should include time in RFC822 format",
      );
    },
  },
  {
    name: "configureFeed-getNewestCollectionItemDate-filter",
    description: "getNewestCollectionItemDate filter finds newest date",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      const newestFilter = mockConfig.filters.getNewestCollectionItemDate;
      const collection = [
        { date: new Date("2024-01-01") },
        { date: new Date("2024-06-15") },
        { date: new Date("2024-03-10") },
      ];
      const result = newestFilter(collection);

      expectStrictEqual(
        result.getTime(),
        new Date("2024-06-15").getTime(),
        "Should return newest date",
      );
    },
  },
  {
    name: "configureFeed-absoluteUrl-filter",
    description: "absoluteUrl filter creates absolute URLs",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      await configureFeed(mockConfig);

      const absoluteUrlFilter = mockConfig.filters.absoluteUrl;
      const result = absoluteUrlFilter("/path/to/page/", "https://example.com");

      expectStrictEqual(
        result,
        "https://example.com/path/to/page/",
        "Should create absolute URL",
      );
    },
  },
];

export default createTestRunner("feed", testCases);
