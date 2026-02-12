import { describe, expect, test } from "bun:test";
import { wrapHtml } from "#test/test-utils.js";
import {
  buildConfigLinksPattern,
  hasConfigLinks,
  hasPhonePattern,
  linkifyConfigLinks,
  linkifyEmails,
  linkifyPhones,
  linkifyUrls,
  parseTextByPattern,
  SKIP_TAGS,
  URL_PATTERN,
} from "#transforms/linkify.js";
import { loadDOM } from "#utils/lazy-dom.js";

// Helper to run transform and get HTML
const transformHtml = async (html, transformFn, config = {}) => {
  const dom = await loadDOM(html);
  transformFn(dom.window.document, config);
  return dom.serialize();
};

// Helper to verify single anchor tag in result
const expectSingleAnchor = (result) =>
  expect(result.match(/<a /g)?.length).toBe(1);

// Shared test case definitions for skip-tag behavior
const skipTagTestCases = [
  {
    name: "URLs",
    transform: linkifyUrls,
    config: {},
    anchorHtml: '<a href="https://example.com">Click</a>',
    nestedHtml:
      '<a href="https://example.com">Visit <span>https://example.com</span></a>',
    scriptHtml: '<script>const url = "https://example.com";</script>',
    notContain: "<a href",
    surroundingHtml: "<p>Before https://example.com after</p>",
  },
  {
    name: "emails",
    transform: linkifyEmails,
    config: {},
    anchorHtml: '<a href="mailto:test@example.com">Contact</a>',
    nestedHtml:
      '<a href="mailto:test@example.com">Contact <span>test@example.com</span></a>',
    scriptHtml: '<script>const email = "test@example.com";</script>',
    notContain: 'href="mailto:',
    surroundingHtml: "<p>Before test@example.com after</p>",
  },
  {
    name: "phones",
    transform: linkifyPhones,
    config: { phoneNumberLength: 11 },
    anchorHtml: '<a href="tel:01234567890">Call us</a>',
    nestedHtml: '<a href="tel:+441234567890">Call <span>01234567890</span></a>',
    scriptHtml: '<script>const phone = "01234567890";</script>',
    notContain: '<a href="tel:',
    surroundingHtml: "<p>Before 01234567890 after</p>",
  },
];

// URL-only skip tags (style, code, pre are tested separately from shared tests)
const urlOnlySkipTags = [
  { tag: "style", html: "<style>/* https://example.com */</style>" },
  { tag: "code", html: "<code>https://example.com</code>" },
  { tag: "pre", html: "<pre>https://example.com</pre>" },
];

describe("linkify transforms", () => {
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
      for (const tag of ["a", "script", "style", "code", "pre"]) {
        expect(SKIP_TAGS.has(tag)).toBe(true);
      }
    });
  });

  describe("linkifyUrls", () => {
    test("converts plain URLs to anchor tags", async () => {
      const html = wrapHtml("<p>Visit https://example.com for more</p>");
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain(">example.com</a>");
    });

    test("adds target=_blank when config enabled", async () => {
      const html = wrapHtml("<p>Visit https://example.com</p>");
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: true,
      });

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    test("does not add target=_blank when config disabled", async () => {
      const html = wrapHtml("<p>Visit https://example.com</p>");
      const result = await transformHtml(html, linkifyUrls, {
        externalLinksTargetBlank: false,
      });

      expect(result).toContain('href="https://example.com"');
      expect(result).not.toContain('target="_blank"');
    });

    test("handles multiple URLs", async () => {
      const html = wrapHtml("<p>See https://foo.com and https://bar.com</p>");
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain('href="https://foo.com"');
      expect(result).toContain('href="https://bar.com"');
    });

    test("strips www. from display text", async () => {
      const html = wrapHtml("<p>Visit https://www.example.com/page</p>");
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain(">example.com/page</a>");
    });

    test("strips trailing slash from display text", async () => {
      const html = wrapHtml("<p>Visit https://example.com/</p>");
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain(">example.com</a>");
    });

    for (const { tag, html } of urlOnlySkipTags) {
      test(`does not linkify URLs inside ${tag} tags`, async () => {
        const result = await transformHtml(wrapHtml(html), linkifyUrls, {});
        expect(result).not.toContain("<a href");
      });
    }

    test("handles HTTP URLs", async () => {
      const html = wrapHtml("<p>Visit http://example.com</p>");
      const result = await transformHtml(html, linkifyUrls, {});

      expect(result).toContain('href="http://example.com"');
    });
  });

  describe("linkifyEmails", () => {
    test("converts plain email addresses to mailto links", async () => {
      const html = wrapHtml("<p>Contact hello@example.com</p>");
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:hello@example.com"');
      expect(result).toContain(">hello@example.com</a>");
    });

    test("handles multiple email addresses", async () => {
      const html = wrapHtml("<p>Email support@foo.com or sales@bar.co.uk</p>");
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:support@foo.com"');
      expect(result).toContain('href="mailto:sales@bar.co.uk"');
    });

    test("handles emails with subdomains", async () => {
      const html = wrapHtml("<p>Email user@mail.example.co.uk</p>");
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:user@mail.example.co.uk"');
    });

    test("handles emails with plus signs", async () => {
      const html = wrapHtml("<p>Email user+tag@example.com</p>");
      const result = await transformHtml(html, linkifyEmails, {});

      expect(result).toContain('href="mailto:user+tag@example.com"');
    });
  });

  describe("linkifyPhones", () => {
    test("converts phone numbers to tel links with length 11", async () => {
      const html = wrapHtml("<p>Call 01234 567 890</p>");
      const result = await transformHtml(html, linkifyPhones, {
        phoneNumberLength: 11,
      });

      expect(result).toContain('href="tel:01234567890"');
      expect(result).toContain(">01234 567 890</a>");
    });

    test("converts phone numbers with custom length", async () => {
      const result = await transformHtml(
        wrapHtml("<p>Call 0123456789</p>"),
        linkifyPhones,
        { phoneNumberLength: 10 },
      );
      expect(result).toContain('href="tel:0123456789"');
    });

    test("converts phone numbers without spaces", async () => {
      const result = await transformHtml(
        wrapHtml("<p>Call 01234567890</p>"),
        linkifyPhones,
        { phoneNumberLength: 11 },
      );
      expect(result).toContain('href="tel:01234567890"');
    });

    test("does not link shorter numbers", async () => {
      const result = await transformHtml(
        wrapHtml("<p>Call 0123456</p>"),
        linkifyPhones,
        { phoneNumberLength: 11 },
      );
      expect(result).not.toContain('href="tel:');
    });

    test("disables phone linking when phoneNumberLength is 0", async () => {
      const result = await transformHtml(
        wrapHtml("<p>Call 01234567890</p>"),
        linkifyPhones,
        { phoneNumberLength: 0 },
      );
      expect(result).not.toContain('href="tel:');
    });

    test("disables phone linking when phoneNumberLength is negative", async () => {
      const result = await transformHtml(
        wrapHtml("<p>Call 01234567890</p>"),
        linkifyPhones,
        { phoneNumberLength: -1 },
      );
      expect(result).not.toContain('href="tel:');
    });

    test("does not allow nested anchor creation", async () => {
      const result = await transformHtml(
        wrapHtml(
          '<a href="tel:+441234567890">Call <span>01234567890</span></a>',
        ),
        linkifyPhones,
        { phoneNumberLength: 11 },
      );
      expect(result).not.toContain("<a><a");
    });
  });

  // Data-driven tests for common skip-tag behavior
  describe("skip-tag behavior (shared across transforms)", () => {
    for (const tc of skipTagTestCases) {
      describe(`${tc.name}`, () => {
        test("does not linkify inside anchor tags", async () => {
          const result = await transformHtml(
            wrapHtml(tc.anchorHtml),
            tc.transform,
            tc.config,
          );
          expectSingleAnchor(result);
        });

        test("does not linkify nested inside anchor tags", async () => {
          const result = await transformHtml(
            wrapHtml(tc.nestedHtml),
            tc.transform,
            tc.config,
          );
          expectSingleAnchor(result);
        });

        test("does not linkify inside script tags", async () => {
          const result = await transformHtml(
            wrapHtml(tc.scriptHtml),
            tc.transform,
            tc.config,
          );
          expect(result).not.toContain(tc.notContain);
        });

        test("preserves surrounding text", async () => {
          const result = await transformHtml(
            wrapHtml(tc.surroundingHtml),
            tc.transform,
            tc.config,
          );
          expect(result).toContain("Before ");
          expect(result).toContain(" after");
        });
      });
    }
  });

  describe("linkifyConfigLinks", () => {
    const linksMap = {
      "Acme Corp": "https://acme.example.com",
      "Widget Pro": "https://widgets.example.com/pro",
    };

    // Helper: linkifyConfigLinks takes (document, linksMap) not (document, config)
    const transformConfigLinks = async (html, map) => {
      const dom = await loadDOM(html);
      linkifyConfigLinks(dom.window.document, map);
      return dom.serialize();
    };

    test("converts matching text to links inside .prose elements", async () => {
      const html = wrapHtml(
        '<div class="prose"><p>Visit Acme Corp for details</p></div>',
      );
      const result = await transformConfigLinks(html, linksMap);

      expect(result).toContain('href="https://acme.example.com"');
      expect(result).toContain(">Acme Corp</a>");
    });

    test("does not linkify text outside .prose elements", async () => {
      const html = wrapHtml("<div><p>Visit Acme Corp for details</p></div>");
      const result = await transformConfigLinks(html, linksMap);

      expect(result).not.toContain("<a ");
    });

    test("handles multiple link texts in same paragraph", async () => {
      const html = wrapHtml(
        '<div class="prose"><p>See Acme Corp and Widget Pro</p></div>',
      );
      const result = await transformConfigLinks(html, linksMap);

      expect(result).toContain('href="https://acme.example.com"');
      expect(result).toContain('href="https://widgets.example.com/pro"');
    });

    test("preserves surrounding text", async () => {
      const html = wrapHtml(
        '<div class="prose"><p>Before Acme Corp after</p></div>',
      );
      const result = await transformConfigLinks(html, linksMap);

      expect(result).toContain("Before ");
      expect(result).toContain(" after");
    });

    test("does not linkify inside anchor tags", async () => {
      const html = wrapHtml(
        '<div class="prose"><a href="/other">Acme Corp</a></div>',
      );
      const result = await transformConfigLinks(html, linksMap);

      expectSingleAnchor(result);
    });

    test("does not linkify inside code tags", async () => {
      const html = wrapHtml('<div class="prose"><code>Acme Corp</code></div>');
      const result = await transformConfigLinks(html, linksMap);

      expect(result).not.toContain('href="https://acme.example.com"');
    });

    test("does nothing when links map is empty", async () => {
      const html = wrapHtml('<div class="prose"><p>Visit Acme Corp</p></div>');
      const result = await transformConfigLinks(html, {});

      expect(result).not.toContain("<a ");
    });

    test("does not match partial words", async () => {
      const map = { test: "https://example.com/test" };
      const html = wrapHtml(
        '<div class="prose"><p>This is a testing scenario</p></div>',
      );
      const result = await transformConfigLinks(html, map);

      expect(result).not.toContain("<a ");
    });

    test("matches text that is a standalone word", async () => {
      const map = { test: "https://example.com/test" };
      const html = wrapHtml('<div class="prose"><p>Run a test today</p></div>');
      const result = await transformConfigLinks(html, map);

      expect(result).toContain('href="https://example.com/test"');
      expect(result).toContain(">test</a>");
    });

    test("handles nested prose elements", async () => {
      const html = wrapHtml(
        '<div class="prose"><div class="prose"><p>Visit Acme Corp</p></div></div>',
      );
      const result = await transformConfigLinks(html, linksMap);

      expect(result).toContain('href="https://acme.example.com"');
    });
  });

  describe("hasConfigLinks", () => {
    test("returns true when content contains a link text", () => {
      expect(
        hasConfigLinks("Visit Acme Corp today", { "Acme Corp": "/acme" }),
      ).toBe(true);
    });

    test("returns false when content has no matching text", () => {
      expect(hasConfigLinks("Visit us today", { "Acme Corp": "/acme" })).toBe(
        false,
      );
    });

    test("returns false when links map is empty", () => {
      expect(hasConfigLinks("Acme Corp", {})).toBe(false);
    });
  });

  describe("hasPhonePattern", () => {
    test("returns true when content contains phone-length digit sequence", () => {
      expect(hasPhonePattern("Call 01234567890", 11)).toBe(true);
    });

    test("returns false when no matching digit sequence", () => {
      expect(hasPhonePattern("Call 012345", 11)).toBe(false);
    });

    test("returns false when phoneLen is 0", () => {
      expect(hasPhonePattern("Call 01234567890", 0)).toBe(false);
    });
  });

  describe("buildConfigLinksPattern", () => {
    test("matches longest text first", () => {
      const pattern = buildConfigLinksPattern(["Acme", "Acme Corp"]);
      const text = "Visit Acme Corp today";
      const matches = [...text.matchAll(pattern)];

      expect(matches.length).toBe(1);
      expect(matches[0][0]).toBe("Acme Corp");
    });

    test("escapes special regex characters in link text", () => {
      const pattern = buildConfigLinksPattern(["C++ Guide"]);
      const text = "Read the C++ Guide now";
      const matches = [...text.matchAll(pattern)];

      expect(matches.length).toBe(1);
      expect(matches[0][0]).toBe("C++ Guide");
    });
  });
});
