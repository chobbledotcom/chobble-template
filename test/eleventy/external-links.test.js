import { describe, test, expect } from "bun:test";
import {
  configureExternalLinks,
  createExternalLinksTransform,
  externalLinkFilter,
  getExternalLinkAttributes,
  isExternalUrl,
  transformExternalLinks,
} from "#eleventy/external-links.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("external-links", () => {
  test("Detects HTTP URLs as external", () => {
    const result = isExternalUrl("http://example.com");
    expect(result).toBe(true);
  });

  test("Detects HTTPS URLs as external", () => {
    const result = isExternalUrl("https://example.com");
    expect(result).toBe(true);
  });

  test("Detects relative URLs as internal", () => {
    const result = isExternalUrl("/about");
    expect(result).toBe(false);
  });

  test("Detects absolute paths as internal", () => {
    const result = isExternalUrl("/pages/about");
    expect(result).toBe(false);
  });

  test("Detects hash links as internal", () => {
    const result = isExternalUrl("#section");
    expect(result).toBe(false);
  });

  test("Detects mailto links as internal", () => {
    const result = isExternalUrl("mailto:test@example.com");
    expect(result).toBe(false);
  });

  test("Handles null input gracefully", () => {
    const result = isExternalUrl(null);
    expect(result).toBe(false);
  });

  test("Handles undefined input gracefully", () => {
    const result = isExternalUrl(undefined);
    expect(result).toBe(false);
  });

  test("Handles empty string gracefully", () => {
    const result = isExternalUrl("");
    expect(result).toBe(false);
  });

  test("Handles non-string input gracefully", () => {
    const result1 = isExternalUrl(123);
    expect(result1).toBe(false);

    const result2 = isExternalUrl({ url: "http://example.com" });
    expect(result2).toBe(false);

    const result3 = isExternalUrl(["http://example.com"]);
    expect(result3).toBe(false);
  });

  test("Returns empty string when config flag is false", () => {
    const config = { externalLinksTargetBlank: false };
    const result = getExternalLinkAttributes("https://example.com", config);
    expect(result).toBe("");
  });

  test("Returns target and rel attributes when config flag is true", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes("https://example.com", config);
    expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
  });

  test("Returns empty string for internal links regardless of config", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes("/about", config);
    expect(result).toBe("");
  });

  test("Handles missing config gracefully", () => {
    const result = getExternalLinkAttributes("https://example.com", null);
    expect(result).toBe("");
  });

  test("Handles undefined config gracefully", () => {
    const result = getExternalLinkAttributes(
      "https://example.com",
      undefined,
    );
    expect(result).toBe("");
  });

  test("Works with HTTP URLs when enabled", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes("http://example.com", config);
    expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
  });

  test("externalLinkFilter delegates to getExternalLinkAttributes", () => {
    const config = { externalLinksTargetBlank: true };
    const result = externalLinkFilter("https://example.com", config);
    expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
  });

  test("Returns content unchanged when config flag is false", async () => {
    const config = { externalLinksTargetBlank: false };
    const html = '<a href="https://example.com">Link</a>';
    const result = await transformExternalLinks(html, config);
    expect(result).toBe(html);
  });

  test("Returns content unchanged when no links present", async () => {
    const config = { externalLinksTargetBlank: true };
    const html = "<p>No links here</p>";
    const result = await transformExternalLinks(html, config);
    expect(result).toBe(html);
  });

  test("Adds target and rel to external links", async () => {
    const config = { externalLinksTargetBlank: true };
    const html =
      '<html><body><a href="https://example.com">Link</a></body></html>';
    const result = await transformExternalLinks(html, config);

    expect(result.includes('target="_blank"')).toBe(true);
    expect(result.includes('rel="noopener noreferrer"')).toBe(true);
  });

  test("Does not modify internal links", async () => {
    const config = { externalLinksTargetBlank: true };
    const html = '<html><body><a href="/about">About</a></body></html>';
    const result = await transformExternalLinks(html, config);

    expect(result.includes('target="_blank"')).toBe(false);
  });

  test("Handles mix of external and internal links", async () => {
    const config = { externalLinksTargetBlank: true };
    const html =
      '<html><body><a href="https://example.com">External</a><a href="/about">Internal</a></body></html>';
    const result = await transformExternalLinks(html, config);

    expect(result.includes('href="https://example.com"')).toBe(true);
    expect(result.includes('href="/about"')).toBe(true);
    expect(result.includes('target="_blank"')).toBe(true);
  });

  test("Preserves other link attributes", async () => {
    const config = { externalLinksTargetBlank: true };
    const html =
      '<html><body><a href="https://example.com" class="button" id="link1">Link</a></body></html>';
    const result = await transformExternalLinks(html, config);

    expect(result.includes('class="button"')).toBe(true);
    expect(result.includes('id="link1"')).toBe(true);
  });

  test("Handles both HTTP and HTTPS URLs", async () => {
    const config = { externalLinksTargetBlank: true };
    const html =
      '<html><body><a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a></body></html>';
    const result = await transformExternalLinks(html, config);

    const targetCount = (result.match(/target="_blank"/g) || []).length;
    expect(targetCount).toBe(2);
  });

  test("Handles null content gracefully", async () => {
    const config = { externalLinksTargetBlank: true };
    const result = await transformExternalLinks(null, config);
    expect(result).toBe(null);
  });

  test("Handles empty content gracefully", async () => {
    const config = { externalLinksTargetBlank: true };
    const result = await transformExternalLinks("", config);
    expect(result).toBe("");
  });

  test("Creates transform function", () => {
    const config = { externalLinksTargetBlank: false };
    const transform = createExternalLinksTransform(config);

    expect(typeof transform).toBe("function");
  });

  test("Only processes HTML files", async () => {
    const config = { externalLinksTargetBlank: true };
    const transform = createExternalLinksTransform(config);

    const cssContent = "body { color: red; }";
    const result = await transform(cssContent, "style.css");
    expect(result).toBe(cssContent);
  });

  test("Skips feed files", async () => {
    const config = { externalLinksTargetBlank: true };
    const transform = createExternalLinksTransform(config);

    const feedContent = '<a href="https://example.com">Link</a>';
    const result = await transform(feedContent, "feed.xml");
    expect(result).toBe(feedContent);
  });

  test("Processes HTML files", async () => {
    const config = { externalLinksTargetBlank: true };
    const transform = createExternalLinksTransform(config);

    const html =
      '<html><body><a href="https://example.com">Link</a></body></html>';
    const result = await transform(html, "index.html");

    expect(result.includes('target="_blank"')).toBe(true);
  });

  test("Adds externalLinkAttrs filter to Eleventy config", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig);

    expect(typeof mockConfig.filters.externalLinkAttrs).toBe("function");
  });

  test("Adds HTML transform to Eleventy config", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig);

    expect(typeof mockConfig.transforms.externalLinks).toBe("function");
  });

  test("Configured filter uses loaded config", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig);

    expect(typeof mockConfig.filters.externalLinkAttrs).toBe("function");

    const result = mockConfig.filters.externalLinkAttrs(
      "https://example.com",
    );
    expect(typeof result).toBe("string");
  });

  test("Handles URLs with spaces", () => {
    const result = isExternalUrl("https://example.com/path with spaces");
    expect(result).toBe(true);
  });

  test("Handles URLs with query parameters", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes(
      "https://example.com?foo=bar&baz=qux",
      config,
    );
    expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
  });

  test("Handles external URLs with fragments", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes(
      "https://example.com#section",
      config,
    );
    expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
  });

  test("Always includes rel attribute with noopener and noreferrer", () => {
    const config = { externalLinksTargetBlank: true };
    const result = getExternalLinkAttributes("https://example.com", config);

    expect(result.includes('rel="noopener noreferrer"')).toBe(true);
  });

  test("Functions should be pure and not modify inputs", () => {
    const config = { externalLinksTargetBlank: true };
    const configCopy = JSON.parse(JSON.stringify(config));

    getExternalLinkAttributes("https://example.com", config);

    expect(JSON.stringify(config)).toBe(JSON.stringify(configCopy));
  });
});
