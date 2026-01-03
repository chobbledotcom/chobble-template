import { describe, expect, test } from "bun:test";
import { configureResponsiveTables } from "#eleventy/responsive-tables.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("responsive-tables", () => {
  test("Adds responsiveTables transform to Eleventy config", () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    expect(typeof mockConfig.transforms.responsiveTables).toBe("function");
  });

  test("Returns content unchanged when no table present", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html = "<p>No table here</p>";
    const result = await mockConfig.transforms.responsiveTables(
      html,
      "test.html",
    );
    expect(result).toBe(html);
  });

  test("Handles null content gracefully", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const result = await mockConfig.transforms.responsiveTables(
      null,
      "test.html",
    );
    expect(result).toBe(null);
  });

  test("Handles empty content gracefully", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const result = await mockConfig.transforms.responsiveTables(
      "",
      "test.html",
    );
    expect(result).toBe("");
  });

  test("Wraps table in scrollable-table div", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html =
      "<html><body><table><tr><td>Cell</td></tr></table></body></html>";
    const result = await mockConfig.transforms.responsiveTables(
      html,
      "test.html",
    );

    expect(result.includes('class="scrollable-table"')).toBe(true);
    expect(result.includes("<table>")).toBe(true);
  });

  test("Wraps multiple tables", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html =
      "<html><body><table><tr><td>A</td></tr></table><table><tr><td>B</td></tr></table></body></html>";
    const result = await mockConfig.transforms.responsiveTables(
      html,
      "test.html",
    );

    const wrapperCount = (result.match(/class="scrollable-table"/g) || [])
      .length;
    expect(wrapperCount).toBe(2);
  });

  test("Does not double-wrap tables already in scrollable-table", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html =
      '<html><body><div class="scrollable-table"><table><tr><td>Cell</td></tr></table></div></body></html>';
    const result = await mockConfig.transforms.responsiveTables(
      html,
      "test.html",
    );

    const wrapperCount = (result.match(/class="scrollable-table"/g) || [])
      .length;
    expect(wrapperCount).toBe(1);
  });

  test("Preserves table attributes", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html =
      '<html><body><table class="my-table" id="data"><tr><td>Cell</td></tr></table></body></html>';
    const result = await mockConfig.transforms.responsiveTables(
      html,
      "test.html",
    );

    expect(result.includes('class="my-table"')).toBe(true);
    expect(result.includes('id="data"')).toBe(true);
  });

  test("Only processes HTML files", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const cssContent = "body { color: red; }";
    const result = await mockConfig.transforms.responsiveTables(
      cssContent,
      "style.css",
    );
    expect(result).toBe(cssContent);
  });

  test("Returns content unchanged when no output path", async () => {
    const mockConfig = createMockEleventyConfig();
    configureResponsiveTables(mockConfig);

    const html = "<table><tr><td>Cell</td></tr></table>";
    const result = await mockConfig.transforms.responsiveTables(html, null);
    expect(result).toBe(html);
  });
});
