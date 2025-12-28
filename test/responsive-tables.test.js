import { configureResponsiveTables } from "#eleventy/responsive-tables.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const testCases = [
  {
    name: "configureResponsiveTables-registers-transform",
    description: "Adds responsiveTables transform to Eleventy config",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      expectFunctionType(
        mockConfig.transforms,
        "responsiveTables",
        "Should add responsiveTables transform",
      );
    },
  },
  {
    name: "transform-no-table",
    description: "Returns content unchanged when no table present",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html = "<p>No table here</p>";
      const result = mockConfig.transforms.responsiveTables(html, "test.html");
      expectStrictEqual(result, html, "Should return unchanged HTML");
    },
  },
  {
    name: "transform-null-content",
    description: "Handles null content gracefully",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const result = mockConfig.transforms.responsiveTables(null, "test.html");
      expectStrictEqual(result, null, "Should return null for null content");
    },
  },
  {
    name: "transform-empty-content",
    description: "Handles empty content gracefully",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const result = mockConfig.transforms.responsiveTables("", "test.html");
      expectStrictEqual(result, "", "Should return empty string");
    },
  },
  {
    name: "transform-wraps-table",
    description: "Wraps table in scrollable-table div",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html =
        "<html><body><table><tr><td>Cell</td></tr></table></body></html>";
      const result = mockConfig.transforms.responsiveTables(html, "test.html");

      expectTrue(
        result.includes('class="scrollable-table"'),
        "Should add scrollable-table wrapper",
      );
      expectTrue(result.includes("<table>"), "Should preserve table element");
    },
  },
  {
    name: "transform-multiple-tables",
    description: "Wraps multiple tables",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html =
        "<html><body><table><tr><td>A</td></tr></table><table><tr><td>B</td></tr></table></body></html>";
      const result = mockConfig.transforms.responsiveTables(html, "test.html");

      const wrapperCount = (result.match(/class="scrollable-table"/g) || [])
        .length;
      expectStrictEqual(wrapperCount, 2, "Should wrap both tables");
    },
  },
  {
    name: "transform-already-wrapped",
    description: "Does not double-wrap tables already in scrollable-table",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html =
        '<html><body><div class="scrollable-table"><table><tr><td>Cell</td></tr></table></div></body></html>';
      const result = mockConfig.transforms.responsiveTables(html, "test.html");

      const wrapperCount = (result.match(/class="scrollable-table"/g) || [])
        .length;
      expectStrictEqual(wrapperCount, 1, "Should not double-wrap");
    },
  },
  {
    name: "transform-preserves-attributes",
    description: "Preserves table attributes",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html =
        '<html><body><table class="my-table" id="data"><tr><td>Cell</td></tr></table></body></html>';
      const result = mockConfig.transforms.responsiveTables(html, "test.html");

      expectTrue(result.includes('class="my-table"'), "Should preserve class");
      expectTrue(result.includes('id="data"'), "Should preserve id");
    },
  },
  {
    name: "transform-html-only",
    description: "Only processes HTML files",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const cssContent = "body { color: red; }";
      const result = mockConfig.transforms.responsiveTables(
        cssContent,
        "style.css",
      );
      expectStrictEqual(
        result,
        cssContent,
        "Should not process non-HTML files",
      );
    },
  },
  {
    name: "transform-no-output-path",
    description: "Returns content unchanged when no output path",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureResponsiveTables(mockConfig);

      const html = "<table><tr><td>Cell</td></tr></table>";
      const result = mockConfig.transforms.responsiveTables(html, null);
      expectStrictEqual(result, html, "Should return unchanged when no path");
    },
  },
];

export default createTestRunner("responsive-tables", testCases);
