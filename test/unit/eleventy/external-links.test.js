import { describe, expect, test } from "bun:test";
import { configureExternalLinks } from "#eleventy/external-links.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("external-links", () => {
  const setupWithConfig = async (configOverride) => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig, configOverride);
    return mockConfig;
  };

  describe("externalLinkAttrs filter", () => {
    describe("when externalLinksTargetBlank is true", () => {
      test("returns target and rel attributes for HTTPS URLs", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "https://example.com",
        );
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("returns target and rel attributes for HTTP URLs", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result =
          mockConfig.filters.externalLinkAttrs("http://example.com");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("returns empty string for relative URLs", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs("/about");
        expect(result).toBe("");
      });

      test("returns empty string for absolute paths", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs("/pages/about");
        expect(result).toBe("");
      });

      test("returns empty string for hash links", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs("#section");
        expect(result).toBe("");
      });

      test("returns empty string for mailto links", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "mailto:test@example.com",
        );
        expect(result).toBe("");
      });

      test("handles URLs with query parameters", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "https://example.com?foo=bar&baz=qux",
        );
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("handles URLs with fragments", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "https://example.com#section",
        );
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("handles URLs with spaces", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "https://example.com/path with spaces",
        );
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("returns empty string for external URLs", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: false,
        });
        const result = mockConfig.filters.externalLinkAttrs(
          "https://example.com",
        );
        expect(result).toBe("");
      });
    });

    describe("edge cases", () => {
      test("handles null input gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(null);
        expect(result).toBe("");
      });

      test("handles undefined input gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs(undefined);
        expect(result).toBe("");
      });

      test("handles empty string gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = mockConfig.filters.externalLinkAttrs("");
        expect(result).toBe("");
      });

      test("handles non-string input gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        expect(mockConfig.filters.externalLinkAttrs(123)).toBe("");
        expect(
          mockConfig.filters.externalLinkAttrs({ url: "http://example.com" }),
        ).toBe("");
        expect(
          mockConfig.filters.externalLinkAttrs(["http://example.com"]),
        ).toBe("");
      });
    });
  });

  describe("externalLinks transform", () => {
    describe("when externalLinksTargetBlank is true", () => {
      test("adds target and rel attributes to external links", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com">Link</a></body></html>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );

        expect(result.includes('target="_blank"')).toBe(true);
        expect(result.includes('rel="noopener noreferrer"')).toBe(true);
      });

      test("does not modify internal links", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html = '<html><body><a href="/about">About</a></body></html>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );

        expect(result.includes('target="_blank"')).toBe(false);
      });

      test("handles mix of external and internal links", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com">External</a><a href="/about">Internal</a></body></html>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );

        expect(result.includes('href="https://example.com"')).toBe(true);
        expect(result.includes('href="/about"')).toBe(true);
        const targetCount = (result.match(/target="_blank"/g) || []).length;
        expect(targetCount).toBe(1);
      });

      test("handles both HTTP and HTTPS URLs", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a></body></html>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );

        const targetCount = (result.match(/target="_blank"/g) || []).length;
        expect(targetCount).toBe(2);
      });

      test("preserves other link attributes", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com" class="button" id="link1">Link</a></body></html>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );

        expect(result.includes('class="button"')).toBe(true);
        expect(result.includes('id="link1"')).toBe(true);
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("returns content unchanged", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: false,
        });
        const html = '<a href="https://example.com">Link</a>';
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );
        expect(result).toBe(html);
      });
    });

    describe("file type handling", () => {
      test("only processes HTML files", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });

        const cssContent = "body { color: red; }";
        const result = await mockConfig.transforms.externalLinks(
          cssContent,
          "style.css",
        );
        expect(result).toBe(cssContent);
      });

      test("skips non-HTML files like feed.xml", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });

        const feedContent = '<a href="https://example.com">Link</a>';
        const result = await mockConfig.transforms.externalLinks(
          feedContent,
          "_site/feed.xml",
        );
        expect(result).toBe(feedContent);
      });

      test("handles missing outputPath", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });

        const html = '<a href="https://example.com">Link</a>';
        const result = await mockConfig.transforms.externalLinks(html, null);
        expect(result).toBe(html);
      });
    });

    describe("edge cases", () => {
      test("returns content unchanged when no links present", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const html = "<p>No links here</p>";
        const result = await mockConfig.transforms.externalLinks(
          html,
          "index.html",
        );
        expect(result).toBe(html);
      });

      test("handles null content gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = await mockConfig.transforms.externalLinks(
          null,
          "index.html",
        );
        expect(result).toBe(null);
      });

      test("handles empty content gracefully", async () => {
        const mockConfig = await setupWithConfig({
          externalLinksTargetBlank: true,
        });
        const result = await mockConfig.transforms.externalLinks(
          "",
          "index.html",
        );
        expect(result).toBe("");
      });
    });
  });

  describe("configureExternalLinks", () => {
    test("registers externalLinkAttrs filter", async () => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, {
        externalLinksTargetBlank: true,
      });

      expect(typeof mockConfig.filters.externalLinkAttrs).toBe("function");
    });

    test("registers externalLinks transform", async () => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, {
        externalLinksTargetBlank: true,
      });

      expect(typeof mockConfig.transforms.externalLinks).toBe("function");
    });

    test("uses default config when testConfig not provided", async () => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig);

      expect(typeof mockConfig.filters.externalLinkAttrs).toBe("function");
      expect(typeof mockConfig.transforms.externalLinks).toBe("function");
    });
  });
});
