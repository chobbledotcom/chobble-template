import { describe, expect, test } from "bun:test";
import {
  extractRawTextElements,
  restoreRawTextElements,
} from "#transforms/raw-text-guard.js";

describe("raw-text-guard", () => {
  describe("extractRawTextElements", () => {
    test("removes script elements from content", () => {
      const html = "<p>before</p><script>const a = 1;</script><p>after</p>";
      const { content } = extractRawTextElements(html);
      expect(content).not.toContain("<script>");
      expect(content).toContain("<p>before</p>");
      expect(content).toContain("<p>after</p>");
    });

    test("captures the full element including attributes and body", () => {
      const html = '<script type="module">const a = (b) => b > 1;</script>';
      const { blocks } = extractRawTextElements(html);
      expect(blocks).toEqual([html]);
    });

    test("extracts style elements", () => {
      const html = "<style>.a > .b { color: red; }</style>";
      const { blocks } = extractRawTextElements(html);
      expect(blocks).toEqual([html]);
    });

    test("extracts multiple elements in document order", () => {
      const html =
        "<script>first()</script><p>mid</p><style>.x > .y {}</style>";
      const { blocks } = extractRawTextElements(html);
      expect(blocks).toEqual([
        "<script>first()</script>",
        "<style>.x > .y {}</style>",
      ]);
    });

    test("leaves content without raw-text elements unchanged", () => {
      const html = "<p>Visit https://example.com</p>";
      const { content, blocks } = extractRawTextElements(html);
      expect(content).toBe(html);
      expect(blocks).toEqual([]);
    });

    test("throws when content already contains NUL bytes", () => {
      expect(() => extractRawTextElements("<p>\u0000</p>")).toThrow(
        "NUL bytes",
      );
    });
  });

  describe("restoreRawTextElements", () => {
    const extractAndRestore = (html) => {
      const { content, blocks } = extractRawTextElements(html);
      return restoreRawTextElements(content, blocks);
    };

    test("round-trips content byte-for-byte", () => {
      const html =
        "<p>x</p><script>if (a > b && c < d) f();</script><style>.a > .b {}</style>";
      expect(extractAndRestore(html)).toBe(html);
    });

    test("preserves $ substitution patterns in script bodies", () => {
      const html = '<script>str.replace(/x/, "$& $\' $1");</script>';
      expect(extractAndRestore(html)).toBe(html);
    });

    test("round-trips duplicate identical script elements", () => {
      const html =
        "<script>same()</script><p>https://example.com</p><script>same()</script>";
      expect(extractAndRestore(html)).toBe(html);
    });

    test("restores blocks after surrounding content was transformed", () => {
      const html = "<p>plain</p><script>const f = (a) => a;</script>";
      const { content, blocks } = extractRawTextElements(html);
      const transformed = content.replace("plain", "<a>linked</a>");
      expect(restoreRawTextElements(transformed, blocks)).toBe(
        "<p><a>linked</a></p><script>const f = (a) => a;</script>",
      );
    });

    test("throws when a placeholder was destroyed by the transform", () => {
      const { content, blocks } = extractRawTextElements(
        "<script>a()</script>",
      );
      const mangled = content.replace("\u0000", "");
      expect(() => restoreRawTextElements(mangled, blocks)).toThrow(
        "missing after transform",
      );
    });
  });
});
