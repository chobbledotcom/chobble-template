import { describe, expect, test } from "bun:test";
import {
  configureExternalLinks,
  formatUrlForDisplay,
} from "#eleventy/external-links.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("external-links", () => {
  // Get filter with specified config - follows area-list.test.js pattern
  const getFilter = async (config) => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig, config);
    return mockConfig.filters.externalLinkAttrs;
  };

  // Get transform with specified config
  const getTransform = async (config) => {
    const mockConfig = createMockEleventyConfig();
    await configureExternalLinks(mockConfig, config);
    return mockConfig.transforms.externalLinks;
  };

  describe("externalLinkAttrs filter", () => {
    describe("when externalLinksTargetBlank is true", () => {
      test("returns target and rel attributes for HTTPS URLs", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("https://example.com");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("returns target and rel attributes for HTTP URLs", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("http://example.com");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("returns empty string for relative URLs", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("/about");
        expect(result).toBe("");
      });

      test("returns empty string for absolute paths", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("/pages/about");
        expect(result).toBe("");
      });

      test("returns empty string for hash links", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("#section");
        expect(result).toBe("");
      });

      test("returns empty string for mailto links", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("mailto:test@example.com");
        expect(result).toBe("");
      });

      test("handles URLs with query parameters", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("https://example.com?foo=bar&baz=qux");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("handles URLs with fragments", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("https://example.com#section");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });

      test("handles URLs with spaces", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("https://example.com/path with spaces");
        expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("returns empty string for external URLs", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: false });
        const result = filter("https://example.com");
        expect(result).toBe("");
      });
    });

    describe("edge cases", () => {
      test("handles null input gracefully", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter(null);
        expect(result).toBe("");
      });

      test("handles undefined input gracefully", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter(undefined);
        expect(result).toBe("");
      });

      test("handles empty string gracefully", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        const result = filter("");
        expect(result).toBe("");
      });

      test("handles non-string input gracefully", async () => {
        const filter = await getFilter({ externalLinksTargetBlank: true });
        expect(filter(123)).toBe("");
        expect(filter({ url: "http://example.com" })).toBe("");
        expect(filter(["http://example.com"])).toBe("");
      });
    });
  });

  describe("externalLinks transform", () => {
    describe("when externalLinksTargetBlank is true", () => {
      test("adds target and rel attributes to external links", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com">Link</a></body></html>';
        const result = await transform(html, "index.html");

        expect(result.includes('target="_blank"')).toBe(true);
        expect(result.includes('rel="noopener noreferrer"')).toBe(true);
      });

      test("does not modify internal links", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html = '<html><body><a href="/about">About</a></body></html>';
        const result = await transform(html, "index.html");

        expect(result.includes('target="_blank"')).toBe(false);
      });

      test("handles mix of external and internal links", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com">External</a><a href="/about">Internal</a></body></html>';
        const result = await transform(html, "index.html");

        expect(result.includes('href="https://example.com"')).toBe(true);
        expect(result.includes('href="/about"')).toBe(true);
        const targetCount = (result.match(/target="_blank"/g) || []).length;
        expect(targetCount).toBe(1);
      });

      test("handles both HTTP and HTTPS URLs", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a></body></html>';
        const result = await transform(html, "index.html");

        const targetCount = (result.match(/target="_blank"/g) || []).length;
        expect(targetCount).toBe(2);
      });

      test("preserves other link attributes", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com" class="button" id="link1">Link</a></body></html>';
        const result = await transform(html, "index.html");

        expect(result.includes('class="button"')).toBe(true);
        expect(result.includes('id="link1"')).toBe(true);
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("returns content unchanged", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: false,
        });
        const html = '<a href="https://example.com">Link</a>';
        const result = await transform(html, "index.html");
        expect(result).toBe(html);
      });
    });

    describe("file type handling", () => {
      test("only processes HTML files", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const cssContent = "body { color: red; }";
        const result = await transform(cssContent, "style.css");
        expect(result).toBe(cssContent);
      });

      test("skips non-HTML files like feed.xml", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const feedContent = '<a href="https://example.com">Link</a>';
        const result = await transform(feedContent, "_site/feed.xml");
        expect(result).toBe(feedContent);
      });

      test("handles missing outputPath", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html = '<a href="https://example.com">Link</a>';
        const result = await transform(html, null);
        expect(result).toBe(html);
      });
    });

    describe("edge cases", () => {
      test("returns content unchanged when no links present", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const html = "<p>No links here</p>";
        const result = await transform(html, "index.html");
        expect(result).toBe(html);
      });

      test("handles null content gracefully", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const result = await transform(null, "index.html");
        expect(result).toBe(null);
      });

      test("handles empty content gracefully", async () => {
        const transform = await getTransform({
          externalLinksTargetBlank: true,
        });
        const result = await transform("", "index.html");
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

    test("registers linkify filter", async () => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, {
        externalLinksTargetBlank: true,
      });

      expect(typeof mockConfig.filters.linkify).toBe("function");
    });

    test("registers linkifyUrls transform", async () => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, {
        externalLinksTargetBlank: true,
      });

      expect(typeof mockConfig.transforms.linkifyUrls).toBe("function");
    });
  });

  describe("linkifyUrls transform", () => {
    const getLinkifyUrlsTransform = async (config) => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, config);
      return mockConfig.transforms.linkifyUrls;
    };

    describe("when externalLinksTargetBlank is true", () => {
      test("converts plain URLs to anchor tags", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          "<html><body><p>Visit https://www.example.com for more</p></body></html>";
        const result = await transform(html, "index.html");

        expect(result).toContain('href="https://www.example.com"');
        expect(result).toContain(">example.com</a>");
        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer"');
      });

      test("handles multiple URLs in text", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          "<html><body><p>See https://foo.com and https://bar.com</p></body></html>";
        const result = await transform(html, "index.html");

        expect(result).toContain('href="https://foo.com"');
        expect(result).toContain('href="https://bar.com"');
      });

      test("strips www. from display text", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          "<html><body><p>Visit https://www.example.com/page</p></body></html>";
        const result = await transform(html, "index.html");

        expect(result).toContain(">example.com/page</a>");
      });

      test("does not linkify URLs inside existing anchor tags", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><a href="https://example.com">Click here</a></body></html>';
        const result = await transform(html, "index.html");

        // Should not create nested anchors
        expect(result.match(/<a /g)?.length).toBe(1);
      });

      test("does not linkify URLs inside script tags", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          '<html><body><script>const url = "https://example.com";</script></body></html>';
        const result = await transform(html, "index.html");

        expect(result).not.toContain("<a href");
      });

      test("does not linkify URLs inside style tags", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          "<html><body><style>/* https://example.com */</style></body></html>";
        const result = await transform(html, "index.html");

        expect(result).not.toContain("<a href");
      });

      test("preserves surrounding text", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html =
          "<html><body><p>Before https://example.com after</p></body></html>";
        const result = await transform(html, "index.html");

        expect(result).toContain("Before ");
        expect(result).toContain(" after");
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("creates links without target attributes", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: false,
        });
        const html =
          "<html><body><p>Visit https://example.com</p></body></html>";
        const result = await transform(html, "index.html");

        expect(result).toContain('href="https://example.com"');
        expect(result).not.toContain('target="_blank"');
      });
    });

    describe("file type handling", () => {
      test("only processes HTML files", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const content = "Visit https://example.com";
        const result = await transform(content, "file.txt");
        expect(result).toBe(content);
      });

      test("skips non-HTML files", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const content = "https://example.com";
        const result = await transform(content, "feed.xml");
        expect(result).toBe(content);
      });
    });

    describe("edge cases", () => {
      test("returns content unchanged when no URLs present", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const html = "<html><body><p>No links here</p></body></html>";
        const result = await transform(html, "index.html");
        expect(result).toBe(html);
      });

      test("handles null content", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const result = await transform(null, "index.html");
        expect(result).toBe(null);
      });

      test("handles empty content", async () => {
        const transform = await getLinkifyUrlsTransform({
          externalLinksTargetBlank: true,
        });
        const result = await transform("", "index.html");
        expect(result).toBe("");
      });
    });
  });

  describe("formatUrlForDisplay", () => {
    test("strips https:// from URL", () => {
      expect(formatUrlForDisplay("https://example.com")).toBe("example.com");
    });

    test("strips http:// from URL", () => {
      expect(formatUrlForDisplay("http://example.com")).toBe("example.com");
    });

    test("strips www. from URL", () => {
      expect(formatUrlForDisplay("https://www.example.com")).toBe(
        "example.com",
      );
    });

    test("strips trailing slash", () => {
      expect(formatUrlForDisplay("https://example.com/")).toBe("example.com");
    });

    test("preserves path after domain", () => {
      expect(formatUrlForDisplay("https://www.example.com/page")).toBe(
        "example.com/page",
      );
    });

    test("preserves query parameters", () => {
      expect(formatUrlForDisplay("https://example.com?foo=bar")).toBe(
        "example.com?foo=bar",
      );
    });

    test("handles URLs without protocol", () => {
      expect(formatUrlForDisplay("www.example.com")).toBe("example.com");
    });

    test("returns empty string for null", () => {
      expect(formatUrlForDisplay(null)).toBe("");
    });

    test("returns empty string for undefined", () => {
      expect(formatUrlForDisplay(undefined)).toBe("");
    });

    test("returns empty string for non-string", () => {
      expect(formatUrlForDisplay(123)).toBe("");
    });
  });

  describe("linkify filter", () => {
    const getLinkifyFilter = async (config) => {
      const mockConfig = createMockEleventyConfig();
      await configureExternalLinks(mockConfig, config);
      return mockConfig.filters.linkify;
    };

    describe("when externalLinksTargetBlank is true", () => {
      test("creates anchor tag with cleaned display text", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        const result = linkify("https://www.example.com");
        expect(result).toBe(
          '<a href="https://www.example.com" target="_blank" rel="noopener noreferrer">example.com</a>',
        );
      });

      test("preserves path in display text", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        const result = linkify("https://example.com/page");
        expect(result).toBe(
          '<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">example.com/page</a>',
        );
      });

      test("strips trailing slash from display", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        const result = linkify("https://example.com/");
        expect(result).toBe(
          '<a href="https://example.com/" target="_blank" rel="noopener noreferrer">example.com</a>',
        );
      });
    });

    describe("when externalLinksTargetBlank is false", () => {
      test("creates anchor tag without target attributes", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: false,
        });
        const result = linkify("https://www.example.com");
        expect(result).toBe(
          '<a href="https://www.example.com">example.com</a>',
        );
      });
    });

    describe("with internal URLs", () => {
      test("does not add target attributes for relative URLs", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        const result = linkify("/about");
        expect(result).toBe('<a href="/about">/about</a>');
      });
    });

    describe("edge cases", () => {
      test("returns empty string for null", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        expect(linkify(null)).toBe("");
      });

      test("returns empty string for undefined", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        expect(linkify(undefined)).toBe("");
      });

      test("returns empty string for non-string", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        expect(linkify(123)).toBe("");
      });

      test("returns empty string for empty string", async () => {
        const linkify = await getLinkifyFilter({
          externalLinksTargetBlank: true,
        });
        expect(linkify("")).toBe("");
      });
    });
  });
});
