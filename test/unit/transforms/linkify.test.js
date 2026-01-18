import { describe, expect, test } from "bun:test";
import {
  linkifyUrls,
  linkifyEmails,
  linkifyPhones,
  parseTextByPattern,
  URL_PATTERN,
  EMAIL_PATTERN,
  SKIP_TAGS,
} from "#transforms/linkify.js";
import { loadDOM } from "#utils/lazy-dom.js";

describe("linkify transforms", () => {
  // Helper to run transform and get HTML
  const transformHtml = async (html, transformFn, config = {}) => {
    const dom = await loadDOM(html);
    transformFn(dom.window.document, config);
    return dom.serialize();
  };

  describe("parseTextByPattern", () => {
    test("returns single text part when no matches", () => {
      const result = parseTextByPattern("hello world", URL_PATTERN, (v) => ({
        type: "url",
        value: v,
      }));
      expect(result).toEqual([{ type: "text", value: "hello world" }]);
    });

    test("parses single URL in text", () => {
      const result = parseTextByPattern(
        "visit https://example.com today",
        URL_PATTERN,
        (v) => ({ type: "url", value: v }),
      );
      expect(result).toEqual([
        { type: "text", value: "visit " },
        { type: "url", value: "https://example.com" },
        { type: "text", value: " today" },
      ]);
    });

    test("parses multiple URLs in text", () => {
      const result = parseTextByPattern(
        "see https://foo.com and https://bar.com",
        URL_PATTERN,
        (v) => ({ type: "url", value: v }),
      );
      expect(result.length).toBe(4);
      expect(result[1]).toEqual({ type: "url", value: "https://foo.com" });
      expect(result[3]).toEqual({ type: "url", value: "https://bar.com" });
    });

    test("handles URL at start of text", () => {
      const result = parseTextByPattern(
        "https://example.com is great",
        URL_PATTERN,
        (v) => ({ type: "url", value: v }),
      );
      expect(result[0]).toEqual({ type: "url", value: "https://example.com" });
    });

    test("handles URL at end of text", () => {
      const result = parseTextByPattern(
        "visit https://example.com",
        URL_PATTERN,
        (v) => ({ type: "url", value: v }),
      );
      expect(result[result.length - 1]).toEqual({
        type: "url",
        value: "https://example.com",
      });
    });
  });

  describe("SKIP_TAGS constant", () => {
    test("includes expected tags", () => {
      expect(SKIP_TAGS).toContain("a");
      expect(SKIP_TAGS).toContain("script");
      expect(SKIP_TAGS).toContain("style");
      expect(SKIP_TAGS).toContain("code");
      expect(SKIP_TAGS).toContain("pre");
    });
  });

  describe("linkifyUrls", () => {
    test("converts plain URLs to anchor tags", async () => {
      const html =
        "<html><body><p>Visit https://example.com for more</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain(">example.com</a>");
    });

    test("adds target=_blank when config enabled", async () => {
      const html =
        "<html><body><p>Visit https://example.com</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    test("does not add target=_blank when config disabled", async () => {
      const html =
        "<html><body><p>Visit https://example.com</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: false,
      });

      expect(result).toContain('href="https://example.com"');
      expect(result).not.toContain('target="_blank"');
    });

    test("handles multiple URLs", async () => {
      const html =
        "<html><body><p>See https://foo.com and https://bar.com</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain('href="https://foo.com"');
      expect(result).toContain('href="https://bar.com"');
    });

    test("strips www. from display text", async () => {
      const html =
        "<html><body><p>Visit https://www.example.com/page</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain(">example.com/page</a>");
    });

    test("strips trailing slash from display text", async () => {
      const html =
        "<html><body><p>Visit https://example.com/</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain(">example.com</a>");
    });

    test("does not linkify URLs inside anchor tags", async () => {
      const html =
        '<html><body><a href="https://example.com">Click</a></body></html>';
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result.match(/<a /g)?.length).toBe(1);
    });

    test("does not linkify URLs inside script tags", async () => {
      const html =
        '<html><body><script>const url = "https://example.com";</script></body></html>';
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).not.toContain("<a href");
    });

    test("does not linkify URLs inside style tags", async () => {
      const html =
        "<html><body><style>/* https://example.com */</style></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).not.toContain("<a href");
    });

    test("does not linkify URLs inside code tags", async () => {
      const html =
        "<html><body><code>https://example.com</code></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).not.toContain("<a href");
    });

    test("does not linkify URLs inside pre tags", async () => {
      const html = "<html><body><pre>https://example.com</pre></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).not.toContain("<a href");
    });

    test("preserves surrounding text", async () => {
      const html =
        "<html><body><p>Before https://example.com after</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain("Before ");
      expect(result).toContain(" after");
    });

    test("handles HTTP URLs", async () => {
      const html = "<html><body><p>Visit http://example.com</p></body></html>";
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain('href="http://example.com"');
    });
  });

  describe("linkifyEmails", () => {
    test("converts plain email addresses to mailto links", async () => {
      const html =
        "<html><body><p>Contact hello@example.com</p></body></html>";
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:hello@example.com"');
      expect(result).toContain(">hello@example.com</a>");
    });

    test("handles multiple email addresses", async () => {
      const html =
        "<html><body><p>Email support@foo.com or sales@bar.co.uk</p></body></html>";
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:support@foo.com"');
      expect(result).toContain('href="mailto:sales@bar.co.uk"');
    });

    test("does not linkify emails inside anchor tags", async () => {
      const html =
        '<html><body><a href="mailto:test@example.com">Contact</a></body></html>';
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result.match(/<a /g)?.length).toBe(1);
    });

    test("does not linkify emails inside script tags", async () => {
      const html =
        '<html><body><script>const email = "test@example.com";</script></body></html>';
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).not.toContain('href="mailto:');
    });

    test("preserves surrounding text", async () => {
      const html =
        "<html><body><p>Before test@example.com after</p></body></html>";
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain("Before ");
      expect(result).toContain(" after");
    });

    test("handles emails with subdomains", async () => {
      const html =
        "<html><body><p>Email user@mail.example.co.uk</p></body></html>";
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:user@mail.example.co.uk"');
    });

    test("handles emails with plus signs", async () => {
      const html =
        "<html><body><p>Email user+tag@example.com</p></body></html>";
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:user+tag@example.com"');
    });
  });

  describe("linkifyPhones", () => {
    test("converts phone numbers to tel links with default length 11", async () => {
      const html = "<html><body><p>Call 01234 567 890</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {});

      expect(result).toContain('href="tel:01234567890"');
      expect(result).toContain(">01234 567 890</a>");
    });

    test("converts phone numbers with custom length", async () => {
      const html = "<html><body><p>Call 0123456789</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 10,
      });

      expect(result).toContain('href="tel:0123456789"');
    });

    test("converts phone numbers without spaces", async () => {
      const html = "<html><body><p>Call 01234567890</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result).toContain('href="tel:01234567890"');
    });

    test("does not link shorter numbers", async () => {
      const html = "<html><body><p>Call 0123456</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result).not.toContain('href="tel:');
    });

    test("disables phone linking when phoneNumberLength is 0", async () => {
      const html = "<html><body><p>Call 01234567890</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 0,
      });

      expect(result).not.toContain('href="tel:');
    });

    test("disables phone linking when phoneNumberLength is negative", async () => {
      const html = "<html><body><p>Call 01234567890</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: -1,
      });

      expect(result).not.toContain('href="tel:');
    });

    test("does not linkify phones inside anchor tags", async () => {
      const html =
        '<html><body><a href="tel:01234567890">Call us</a></body></html>';
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result.match(/<a /g)?.length).toBe(1);
    });

    test("does not linkify phones inside script tags", async () => {
      const html =
        '<html><body><script>const phone = "01234567890";</script></body></html>';
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result).not.toContain('<a href="tel:');
    });

    test("preserves surrounding text", async () => {
      const html = "<html><body><p>Before 01234567890 after</p></body></html>";
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result).toContain("Before ");
      expect(result).toContain(" after");
    });
  });
});
