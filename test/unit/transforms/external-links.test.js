import { describe, expect, test } from "bun:test";
import {
  addExternalLinkAttrs,
  getExternalLinkAttrs,
  isExternalUrl,
} from "#transforms/external-links.js";
import { loadDOM } from "#utils/lazy-dom.js";

describe("external-links transform", () => {
  describe("isExternalUrl", () => {
    test("returns true for HTTPS URLs", () => {
      expect(isExternalUrl("https://example.com")).toBe(true);
    });

    test("returns true for HTTP URLs", () => {
      expect(isExternalUrl("http://example.com")).toBe(true);
    });

    test("returns false for relative URLs", () => {
      expect(isExternalUrl("/about")).toBe(false);
    });

    test("returns false for hash links", () => {
      expect(isExternalUrl("#section")).toBe(false);
    });

    test("returns false for mailto links", () => {
      expect(isExternalUrl("mailto:test@example.com")).toBe(false);
    });

    test("returns false for tel links", () => {
      expect(isExternalUrl("tel:01onal234567890")).toBe(false);
    });
  });

  describe("getExternalLinkAttrs", () => {
    test("returns attributes for external URL when targetBlank true", () => {
      const result = getExternalLinkAttrs("https://example.com", true);
      expect(result).toBe(' target="_blank" rel="noopener noreferrer"');
    });

    test("returns empty string for external URL when targetBlank false", () => {
      const result = getExternalLinkAttrs("https://example.com", false);
      expect(result).toBe("");
    });

    test("returns empty string for internal URL", () => {
      const result = getExternalLinkAttrs("/about", true);
      expect(result).toBe("");
    });

    test("returns empty string for non-string input", () => {
      expect(getExternalLinkAttrs(null, true)).toBe("");
      expect(getExternalLinkAttrs(undefined, true)).toBe("");
      expect(getExternalLinkAttrs(123, true)).toBe("");
    });
  });

  describe("addExternalLinkAttrs", () => {
    const transformHtml = async (html, config) => {
      const dom = await loadDOM(html);
      addExternalLinkAttrs(dom.window.document, config);
      return dom.serialize();
    };

    test("adds target and rel to external links when enabled", async () => {
      const html =
        '<html><body><a href="https://example.com">Link</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    test("does not modify links when disabled", async () => {
      const html =
        '<html><body><a href="https://example.com">Link</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: false,
      });

      expect(result).not.toContain('target="_blank"');
    });

    test("does not modify internal links", async () => {
      const html = '<html><body><a href="/about">About</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).not.toContain('target="_blank"');
    });

    test("handles mix of external and internal links", async () => {
      const html =
        '<html><body><a href="https://example.com">External</a><a href="/about">Internal</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).not.toContain('/about" target="_blank"');
    });

    test("handles both HTTP and HTTPS URLs", async () => {
      const html =
        '<html><body><a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('http://example.com" target="_blank"');
      expect(result).toContain('https://example.com" target="_blank"');
    });

    test("preserves other link attributes", async () => {
      const html =
        '<html><body><a href="https://example.com" class="button" id="link1">Link</a></body></html>';
      const result = await transformHtml(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('class="button"');
      expect(result).toContain('id="link1"');
    });

    test("does nothing when config is null", async () => {
      const html =
        '<html><body><a href="https://example.com">Link</a></body></html>';
      const result = await transformHtml(html, null);

      expect(result).not.toContain('target="_blank"');
    });

    test("does nothing when config is undefined", async () => {
      const html =
        '<html><body><a href="https://example.com">Link</a></body></html>';
      const result = await transformHtml(html, undefined);

      expect(result).not.toContain('target="_blank"');
    });
  });
});
