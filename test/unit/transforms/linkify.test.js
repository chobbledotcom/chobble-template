import { describe, expect, test } from "vitest";
import { wrapHtml } from "#test/test-utils.js";
import {
  buildConfigLinksPattern,
  hasConfigLinks,
  hasPhonePattern,
  linkifyConfigLinks,
  linkifyPhones,
  parseTextByPattern,
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

// Raw-text skip tags (style, code, pre, title are tested separately from shared tests)
const rawTextSkipTags = [
  { tag: "style", html: "<style>/* 01234 567 890 */</style>" },
  { tag: "code", html: "<code>01234 567 890</code>" },
  { tag: "pre", html: "<pre>01234 567 890</pre>" },
  { tag: "title", html: "<title>01234 567 890</title>" },
];

describe("linkify transforms", () => {
  describe("parseTextByPattern", () => {
    // A generic three-digit pattern: parseTextByPattern is a generic text
    // splitter; production feeds it phone and config-link patterns.
    const DIGITS = /\d{3}/g;
    const digitPart = (v) => ({ type: "phone", value: v });

    test("returns single text part when no matches", () => {
      const result = parseTextByPattern("hello world", DIGITS, digitPart);
      expect(result).toEqual([{ type: "text", value: "hello world" }]);
    });

    test("parses single match in text", () => {
      const result = parseTextByPattern("call 123 today", DIGITS, digitPart);
      expect(result).toEqual([
        { type: "text", value: "call " },
        { type: "phone", value: "123" },
        { type: "text", value: " today" },
      ]);
    });

    test("parses multiple matches in text", () => {
      const result = parseTextByPattern("see 123 and 456", DIGITS, digitPart);
      expect(result.length).toBe(4);
      expect(result[1]).toEqual({ type: "phone", value: "123" });
      expect(result[3]).toEqual({ type: "phone", value: "456" });
    });

    test("handles match at start of text", () => {
      const result = parseTextByPattern("123 is great", DIGITS, digitPart);
      expect(result[0]).toEqual({ type: "phone", value: "123" });
    });

    test("handles match at end of text", () => {
      const result = parseTextByPattern("call 123", DIGITS, digitPart);
      expect(result[result.length - 1]).toEqual({
        type: "phone",
        value: "123",
      });
    });
  });

  describe("linkifyPhones", () => {
    test("links every matching text node without losing inline structure", async () => {
      const result = await transformHtml(
        wrapHtml("<p>01234 567 890<span>01234567890</span>01234 567 890</p>"),
        linkifyPhones,
        { phoneNumberLength: 11 },
      );
      expect(result).toContain(
        '<p><a href="tel:01234567890">01234 567 890</a><span><a href="tel:01234567890">01234567890</a></span><a href="tel:01234567890">01234 567 890</a></p>',
      );
    });

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

    for (const { tag, html } of rawTextSkipTags) {
      test(`does not linkify phone numbers inside ${tag} tags`, async () => {
        const result = await transformHtml(wrapHtml(html), linkifyPhones, {
          phoneNumberLength: 11,
        });
        expect(result).not.toContain('<a href="tel:');
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

      expect(result).toContain(
        '<p>Visit <a href="https://acme.example.com">Acme Corp</a></p>',
      );
      expectSingleAnchor(result);
    });

    test("links matching text across separate prose roots", async () => {
      const result = await transformConfigLinks(
        wrapHtml(
          '<div class="prose">Acme Corp</div><p>Acme Corp</p><section class="prose">Acme Corp</section>',
        ),
        linksMap,
      );
      expect(result).toContain(
        '<div class="prose"><a href="https://acme.example.com">Acme Corp</a></div><p>Acme Corp</p><section class="prose"><a href="https://acme.example.com">Acme Corp</a></section>',
      );
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
    const expectSingleMatch = (terms, text, expected) => {
      const matches = [...text.matchAll(buildConfigLinksPattern(terms))];
      expect(matches.length).toBe(1);
      expect(matches[0][0]).toBe(expected);
    };

    test("matches longest text first", () => {
      expectSingleMatch(
        ["Acme", "Acme Corp"],
        "Visit Acme Corp today",
        "Acme Corp",
      );
    });

    test("escapes special regex characters in link text", () => {
      expectSingleMatch(["C++ Guide"], "Read the C++ Guide now", "C++ Guide");
    });
  });
});
