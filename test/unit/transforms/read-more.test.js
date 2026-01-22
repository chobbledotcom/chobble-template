import { beforeEach, describe, expect, test } from "bun:test";
import {
  hasReadMoreMarker,
  processReadMore,
  READ_MORE_PATTERN,
  resetIdCounter,
  splitAtMarker,
} from "#transforms/read-more.js";
import { loadDOM } from "#utils/lazy-dom.js";

describe("read-more transform", () => {
  const transformHtml = async (html) => {
    const dom = await loadDOM(html);
    processReadMore(dom.window.document);
    return dom.serialize();
  };

  beforeEach(() => {
    resetIdCounter();
  });

  describe("READ_MORE_PATTERN", () => {
    test("matches [Read more..]", () => {
      expect(READ_MORE_PATTERN.test("[Read more..]")).toBe(true);
    });

    test("matches [Read more...]", () => {
      expect(READ_MORE_PATTERN.test("[Read more...]")).toBe(true);
    });

    test("matches [Read more.]", () => {
      expect(READ_MORE_PATTERN.test("[Read more.]")).toBe(true);
    });

    test("is case insensitive", () => {
      expect(READ_MORE_PATTERN.test("[read more..]")).toBe(true);
      expect(READ_MORE_PATTERN.test("[READ MORE..]")).toBe(true);
      expect(READ_MORE_PATTERN.test("[Read More..]")).toBe(true);
    });

    test("does not match without brackets", () => {
      expect(READ_MORE_PATTERN.test("Read more..")).toBe(false);
    });

    test("does not match with wrong brackets", () => {
      expect(READ_MORE_PATTERN.test("(Read more..)")).toBe(false);
    });
  });

  describe("hasReadMoreMarker", () => {
    test("returns true when marker is present", () => {
      expect(hasReadMoreMarker("Some text [Read more..] more text")).toBe(true);
    });

    test("returns false when marker is not present", () => {
      expect(hasReadMoreMarker("Some text without marker")).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(hasReadMoreMarker("")).toBe(false);
    });
  });

  describe("splitAtMarker", () => {
    test("splits text at marker", () => {
      const result = splitAtMarker("Before [Read more..] After");
      expect(result).toEqual({
        before: "Before ",
        after: " After",
      });
    });

    test("returns null when no marker present", () => {
      const result = splitAtMarker("No marker here");
      expect(result).toBeNull();
    });

    test("handles marker at start", () => {
      const result = splitAtMarker("[Read more..]After content");
      expect(result).toEqual({
        before: "",
        after: "After content",
      });
    });

    test("handles marker at end", () => {
      const result = splitAtMarker("Before content[Read more..]");
      expect(result).toEqual({
        before: "Before content",
        after: "",
      });
    });
  });

  describe("processReadMore", () => {
    test("creates checkbox and label for read-more marker", async () => {
      const html =
        "<html><body><p>Intro text [Read more..] Hidden content</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('<input type="checkbox"');
      expect(result).toContain('class="read-more-toggle"');
      expect(result).toContain('id="read-more-1"');
      expect(result).toContain("<label");
      expect(result).toContain('for="read-more-1"');
      expect(result).toContain('class="read-more-label"');
    });

    test("adds accessibility attributes to toggle", async () => {
      const html = "<html><body><p>Intro [Read more..] More</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('aria-hidden="true"');
      expect(result).toContain('role="button"');
      expect(result).toContain('tabindex="0"');
    });

    test("creates inline wrapper for rest of line content", async () => {
      const html =
        "<html><body><p>Intro [Read more..] Hidden</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain("read-more-content");
      expect(result).toContain("read-more-inline");
      expect(result).toContain("<span");
    });

    test("preserves text before marker in paragraph", async () => {
      const html =
        "<html><body><p>This is intro text [Read more..] Hidden content</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain("<p>This is intro text </p>");
    });

    test("puts inline text after marker in span wrapper", async () => {
      const html =
        "<html><body><p>Intro [Read more..] This should be hidden</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toMatch(
        /<span class="read-more-content read-more-inline">\s*This should be hidden<\/span>/,
      );
    });

    test("moves following paragraphs into block wrapper", async () => {
      const html =
        "<html><body><p>Intro [Read more..]</p><p>Following paragraph</p><p>Another paragraph</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('<div class="read-more-content">');
      expect(result).toMatch(
        /<div class="read-more-content">.*Following paragraph.*Another paragraph.*<\/div>/s,
      );
    });

    test("handles inline text AND following paragraphs together", async () => {
      const html =
        "<html><body><p>Intro [Read more..] Rest of line.</p><p>Second paragraph.</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain(
        '<span class="read-more-content read-more-inline">',
      );
      expect(result).toContain('<div class="read-more-content">');
      expect(result).toMatch(/read-more-inline.*Rest of line/s);
      expect(result).toMatch(
        /<div class="read-more-content">.*Second paragraph/s,
      );
    });

    test("uses unicode ellipsis in label", async () => {
      const html = "<html><body><p>[Read more..]</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain("Read more\u2026");
    });

    test("handles content without marker gracefully", async () => {
      const html = "<html><body><p>No marker here</p></body></html>";
      const result = await transformHtml(html);

      expect(result).not.toContain("read-more-toggle");
      expect(result).toContain("No marker here");
    });

    test("generates unique IDs for multiple markers", async () => {
      const html =
        "<html><body><div><p>First [Read more..] hidden1</p></div><div><p>Second [Read more..] hidden2</p></div></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('id="read-more-1"');
      expect(result).toContain('for="read-more-1"');
      expect(result).toContain('id="read-more-2"');
      expect(result).toContain('for="read-more-2"');
    });

    test("handles marker with different dot counts", async () => {
      const html = "<html><body><p>[Read more...] hidden</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('class="read-more-toggle"');
    });

    test("handles case variations", async () => {
      const html = "<html><body><p>[READ MORE..] hidden</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('class="read-more-toggle"');
    });

    test("handles marker inside nested elements", async () => {
      const html =
        "<html><body><article><section><p>Intro [Read more..] hidden</p></section></article></body></html>";
      const result = await transformHtml(html);

      expect(result).toContain('class="read-more-toggle"');
      expect(result).toContain("read-more-content");
    });

    test("marker text is removed from output", async () => {
      const html =
        "<html><body><p>Before [Read more..] After</p></body></html>";
      const result = await transformHtml(html);

      expect(result).not.toContain("[Read more..]");
      expect(result).not.toContain("[Read more");
      expect(result).not.toContain("more..]");
    });

    test("checkbox and label are placed outside paragraph", async () => {
      const html =
        "<html><body><p>Intro [Read more..] Hidden</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toMatch(/<\/p><input/);
      expect(result).toMatch(/<label[^>]*>Read more/);
    });

    test("elements are siblings for CSS sibling selectors to work", async () => {
      const html =
        "<html><body><p>Intro [Read more..] Hidden</p><p>More</p></body></html>";
      const result = await transformHtml(html);

      expect(result).toMatch(
        /<\/p><input[^>]*><label[^>]*>[^<]*<\/label><span[^>]*>[^<]*<\/span><div/,
      );
    });
  });
});
