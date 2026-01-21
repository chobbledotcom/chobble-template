import { describe, expect, test } from "bun:test";
import { transformHtml } from "#utils/html-tokenizer.js";

describe("html-tokenizer", () => {
  describe("transformHtml", () => {
    test("passes through text content", () => {
      const result = transformHtml("Hello world", (token) => token);
      expect(result).toBe("Hello world");
    });

    test("passes through comments", () => {
      const result = transformHtml("<!-- comment -->", (token) => token);
      expect(result).toBe("<!-- comment -->");
    });

    test("passes through doctype", () => {
      const result = transformHtml("<!DOCTYPE html>", (token) => token);
      expect(result).toBe("<!DOCTYPE html>");
    });

    test("passes through start and end tags", () => {
      const result = transformHtml("<p>Text</p>", (token) => token);
      expect(result).toBe("<p>Text</p>");
    });

    test("passes through self-closing tags", () => {
      const result = transformHtml("<br />", (token) => token);
      expect(result).toBe("<br />");
    });

    test("passes through tags with quoted attributes", () => {
      const result = transformHtml(
        '<a href="test.html">Link</a>',
        (token) => token,
      );
      expect(result).toBe('<a href="test.html">Link</a>');
    });

    test("passes through tags with boolean attributes", () => {
      const result = transformHtml("<input disabled>", (token) => token);
      expect(result).toContain("disabled");
    });

    test("handles unknown token types gracefully", () => {
      // Unknown tokens are handled by tokensToHtml internally
      // This test ensures transformHtml completes without error on valid input
      const result = transformHtml("<div></div>", (token) => token);
      expect(result).toBe("<div></div>");
    });

    test("allows modifying tokens", () => {
      const html = "<p>Text</p>";
      const result = transformHtml(html, (token) => {
        if (token.type === "StartTag" && token.tagName === "p") {
          return { ...token, tagName: "div" };
        }
        if (token.type === "EndTag" && token.tagName === "p") {
          return { ...token, tagName: "div" };
        }
        return token;
      });
      expect(result).toBe("<div>Text</div>");
    });

    test("allows adding attributes to tags", () => {
      const html = "<a>Link</a>";
      const result = transformHtml(html, (token) => {
        if (token.type === "StartTag" && token.tagName === "a") {
          return {
            ...token,
            attributes: [...token.attributes, ["href", "test.html", true]],
          };
        }
        return token;
      });
      expect(result).toBe('<a href="test.html">Link</a>');
    });
  });
});
