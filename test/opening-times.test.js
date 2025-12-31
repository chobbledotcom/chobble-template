import {
  configureOpeningTimes,
  renderOpeningTimes,
} from "#eleventy/opening-times.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const testCases = [
  {
    name: "renderOpeningTimes-empty-array",
    description: "Returns empty string for empty array",
    test: () => {
      const result = renderOpeningTimes([]);
      expectStrictEqual(result, "", "Should return empty string for empty array");
    },
  },
  {
    name: "renderOpeningTimes-null-input",
    description: "Returns empty string for null input",
    test: () => {
      const result = renderOpeningTimes(null);
      expectStrictEqual(result, "", "Should return empty string for null");
    },
  },
  {
    name: "renderOpeningTimes-undefined-input",
    description: "Returns empty string for undefined input",
    test: () => {
      const result = renderOpeningTimes(undefined);
      expectStrictEqual(result, "", "Should return empty string for undefined");
    },
  },
  {
    name: "renderOpeningTimes-single-entry",
    description: "Renders single opening time entry correctly",
    test: () => {
      const input = [{ day: "Monday", hours: "9am - 5pm" }];
      const result = renderOpeningTimes(input);

      expectTrue(
        result.includes('<ul class="opening-times">'),
        "Should have ul with correct class",
      );
      expectTrue(
        result.includes("<strong>Monday:</strong> 9am - 5pm"),
        "Should have day and hours",
      );
      expectTrue(result.includes("<li>"), "Should have list item");
    },
  },
  {
    name: "renderOpeningTimes-multiple-entries",
    description: "Renders multiple opening time entries correctly",
    test: () => {
      const input = [
        { day: "Monday", hours: "9am - 5pm" },
        { day: "Tuesday", hours: "10am - 6pm" },
        { day: "Wednesday", hours: "Closed" },
      ];
      const result = renderOpeningTimes(input);

      expectTrue(
        result.includes("<strong>Monday:</strong> 9am - 5pm"),
        "Should have Monday",
      );
      expectTrue(
        result.includes("<strong>Tuesday:</strong> 10am - 6pm"),
        "Should have Tuesday",
      );
      expectTrue(
        result.includes("<strong>Wednesday:</strong> Closed"),
        "Should have Wednesday",
      );

      const liCount = (result.match(/<li>/g) || []).length;
      expectStrictEqual(liCount, 3, "Should have 3 list items");
    },
  },
  {
    name: "renderOpeningTimes-structure",
    description: "Generates correct HTML structure",
    test: () => {
      const input = [{ day: "Friday", hours: "8am - 4pm" }];
      const result = renderOpeningTimes(input);

      expectTrue(result.startsWith('<ul class="opening-times">'), "Should start with ul");
      expectTrue(result.endsWith("</ul>"), "Should end with closing ul");
      expectTrue(result.includes("</li>"), "Should have closing li tags");
    },
  },
  {
    name: "configureOpeningTimes-registers-shortcode",
    description: "Registers opening_times shortcode",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureOpeningTimes(mockConfig);

      expectFunctionType(
        mockConfig.shortcodes,
        "opening_times",
        "Should register opening_times shortcode",
      );
    },
  },
  {
    name: "configureOpeningTimes-registers-filter",
    description: "Registers format_opening_times filter",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureOpeningTimes(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "format_opening_times",
        "Should register format_opening_times filter",
      );
    },
  },
  {
    name: "configureOpeningTimes-filter-works",
    description: "format_opening_times filter produces correct output",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureOpeningTimes(mockConfig);

      const input = [{ day: "Saturday", hours: "10am - 2pm" }];
      const result = mockConfig.filters.format_opening_times(input);

      expectTrue(
        result.includes("<strong>Saturday:</strong> 10am - 2pm"),
        "Filter should render opening times correctly",
      );
    },
  },
  {
    name: "configureOpeningTimes-filter-empty",
    description: "format_opening_times filter handles empty input",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureOpeningTimes(mockConfig);

      const result = mockConfig.filters.format_opening_times([]);
      expectStrictEqual(result, "", "Filter should return empty string for empty input");
    },
  },
];

export default createTestRunner("opening-times", testCases);
