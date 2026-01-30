import { describe, expect, test } from "bun:test";
import {
  addExternalLinkAttrs,
  isExternalUrl,
} from "#transforms/external-links.js";

describe("external-links transform", () => {
  describe("isExternalUrl", () => {
    test.each([
      { url: "https://example.com", expected: true, label: "HTTPS URL" },
      { url: "http://example.com", expected: true, label: "HTTP URL" },
      { url: "/about", expected: false, label: "relative URL" },
      { url: "#section", expected: false, label: "hash link" },
      { url: "mailto:test@example.com", expected: false, label: "mailto link" },
      { url: "tel:01234567890", expected: false, label: "tel link" },
    ])("returns $expected for $label", ({ url, expected }) => {
      expect(isExternalUrl(url)).toBe(expected);
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

    test.each([null, undefined])("does nothing when config is %p", (config) => {
      const html = '<a href="https://example.com">Link</a>';
      const result = addExternalLinkAttrs(html, config);

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

    test.each([
      { attr: "target", expected: "_blank", old: "_self" },
      { attr: "rel", expected: "noopener noreferrer", old: "author" },
    ])("overwrites existing $attr attribute on external links", ({
      attr,
      expected,
      old,
    }) => {
      const html = `<a href="https://example.com" ${attr}="${old}">Link</a>`;
      const result = addExternalLinkAttrs(html, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain(`${attr}="${expected}"`);
      expect(result).not.toContain(`${attr}="${old}"`);
    });
  });
});
