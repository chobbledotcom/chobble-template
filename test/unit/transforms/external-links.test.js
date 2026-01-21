import { describe, expect, test } from "bun:test";
import {
  addExternalLinkAttrs,
  isExternalUrl,
} from "#transforms/external-links.js";

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
      expect(isExternalUrl("tel:01234567890")).toBe(false);
    });
  });

  describe("addExternalLinkAttrs", () => {
    test("adds target and rel to external links when enabled", () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    test("does not modify links when disabled", () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: false,
      });

      expect(result).not.toContain('target="_blank"');
    });

    test("does not modify internal links", () => {
      const html = '<a href="/about">About</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).not.toContain('target="_blank"');
    });

    test("handles mix of external and internal links", () => {
      const html =
        '<a href="https://example.com">External</a><a href="/about">Internal</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).not.toContain('/about" target="_blank"');
    });

    test("handles both HTTP and HTTPS URLs", () => {
      const html =
        '<a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('http://example.com" target="_blank"');
      expect(result).toContain('https://example.com" target="_blank"');
    });

    test("preserves other link attributes", () => {
      const html =
        '<a href="https://example.com" class="button" id="link1">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('class="button"');
      expect(result).toContain('id="link1"');
    });

    test("does nothing when config is null", () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, null);

      expect(result).not.toContain('target="_blank"');
    });

    test("does nothing when config is undefined", () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, undefined);

      expect(result).not.toContain('target="_blank"');
    });

    test("preserves surrounding HTML content", () => {
      const html =
        '<div><p>Text before</p><a href="https://example.com">Link</a><p>Text after</p></div>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain("<div>");
      expect(result).toContain("<p>Text before</p>");
      expect(result).toContain("<p>Text after</p>");
      expect(result).toContain("</div>");
    });

    test("handles anchor tags with no href", () => {
      const html = '<a name="anchor">Named anchor</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).not.toContain('target="_blank"');
      expect(result).toContain('name="anchor"');
    });

    test("handles self-closing tags correctly", () => {
      const html =
        '<img src="photo.jpg"><a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain("<img");
      expect(result).toContain('target="_blank"');
    });

    test("overwrites existing target attribute on external links", () => {
      const html = '<a href="https://example.com" target="_self">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).not.toContain('target="_self"');
    });

    test("overwrites existing rel attribute on external links", () => {
      const html = '<a href="https://example.com" rel="author">Link</a>';
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).not.toContain('rel="author"');
    });
  });
});
