import { describe, expect, test } from "bun:test";
import { wrapHtml } from "#test/test-utils.js";
import { encryptEmails, hasMailtoLinks } from "#transforms/encrypt-emails.js";
import { loadDOM } from "#utils/lazy-dom.js";

const transformHtml = async (html) => {
  const dom = await loadDOM(html);
  encryptEmails(dom.window.document);
  return dom.serialize();
};

describe("encrypt-emails", () => {
  describe("hasMailtoLinks", () => {
    test("returns true when content has mailto:", () => {
      expect(hasMailtoLinks('<a href="mailto:a@b.com">a@b.com</a>')).toBe(true);
    });

    test("returns false when content has no mailto:", () => {
      expect(hasMailtoLinks("<p>Hello world</p>")).toBe(false);
    });
  });

  describe("encryptEmails", () => {
    test("encrypts href of mailto link", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com">test@example.com</a>',
      );
      const result = await transformHtml(html);
      expect(result).not.toContain("mailto:test@example.com");
      expect(result).not.toContain(">test@example.com<");
    });

    test("adds data-decrypt-link attribute", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com">test@example.com</a>',
      );
      const result = await transformHtml(html);
      expect(result).toContain("data-decrypt-link");
    });

    test("does not modify non-mailto links", async () => {
      const html = wrapHtml('<a href="https://example.com">Example</a>');
      const result = await transformHtml(html);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain(">Example<");
      expect(result).not.toContain("data-decrypt-link");
    });

    test("encrypts multiple mailto links", async () => {
      const html = wrapHtml(
        '<a href="mailto:a@b.com">a@b.com</a> <a href="mailto:c@d.com">c@d.com</a>',
      );
      const result = await transformHtml(html);
      expect(result).not.toContain("mailto:");
      const matches = result.match(/data-decrypt-link/g);
      expect(matches?.length).toBe(2);
    });

    test("preserves link element structure", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com">test@example.com</a>',
      );
      const result = await transformHtml(html);
      expect(result).toContain("<a ");
      expect(result).toContain("</a>");
    });

    test("encrypted href starts with # and contains only URL-safe chars", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com">test@example.com</a>',
      );
      const result = await transformHtml(html);
      const hrefMatch = result.match(/href="([^"]+)"/);
      expect(hrefMatch[1]).toMatch(/^#[0-9a-zA-Z_-]+$/);
    });

    test("preserves inner HTML elements when encrypting", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com"><strong>test@example.com</strong></a>',
      );
      const result = await transformHtml(html);
      expect(result).toContain("<strong>");
      expect(result).toContain("</strong>");
      expect(result).not.toContain("test@example.com");
    });

    test("encrypts text nodes in nested elements", async () => {
      const html = wrapHtml(
        '<a href="mailto:test@example.com"><span>Email</span> test@example.com</a>',
      );
      const result = await transformHtml(html);
      expect(result).toContain("<span>");
      expect(result).not.toContain(">Email<");
      expect(result).not.toContain("test@example.com");
    });
  });
});
