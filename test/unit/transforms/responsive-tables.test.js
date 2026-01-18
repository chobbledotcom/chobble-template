import { describe, expect, test } from "bun:test";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM } from "#utils/lazy-dom.js";

describe("responsive-tables transform", () => {
  const transformHtml = async (html) => {
    const dom = await loadDOM(html);
    wrapTables(dom.window.document, {});
    return dom.serialize();
  };

  const countScrollableTables = (html) =>
    (html.match(/class="scrollable-table"/g) || []).length;

  test("wraps single table in scrollable div", async () => {
    const html =
      "<html><body><table><tr><td>Cell</td></tr></table></body></html>";
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(1);
    expect(result).toContain('<div class="scrollable-table">');
  });

  test("wraps multiple tables", async () => {
    const html =
      "<html><body><table><tr><td>1</td></tr></table><table><tr><td>2</td></tr></table></body></html>";
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(2);
  });

  test("does not double-wrap already wrapped tables", async () => {
    const html =
      '<html><body><div class="scrollable-table"><table><tr><td>Cell</td></tr></table></div></body></html>';
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(1);
  });

  test("preserves table content", async () => {
    const html =
      "<html><body><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table></body></html>";
    const result = await transformHtml(html);

    expect(result).toContain("<th>Header</th>");
    expect(result).toContain("<td>Data</td>");
  });

  test("preserves table attributes", async () => {
    const html =
      '<html><body><table class="data-table" id="main-table"><tr><td>Cell</td></tr></table></body></html>';
    const result = await transformHtml(html);

    expect(result).toContain('class="data-table"');
    expect(result).toContain('id="main-table"');
  });

  test("handles table with no rows", async () => {
    const html = "<html><body><table></table></body></html>";
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(1);
  });

  test("handles complex nested content", async () => {
    const html =
      "<html><body><div><p>Text</p><table><tr><td>Cell</td></tr></table><p>More text</p></div></body></html>";
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(1);
    expect(result).toContain("<p>Text</p>");
    expect(result).toContain("<p>More text</p>");
  });

  test("does not affect page without tables", async () => {
    const html = "<html><body><p>No tables here</p></body></html>";
    const result = await transformHtml(html);

    expect(countScrollableTables(result)).toBe(0);
    expect(result).toContain("<p>No tables here</p>");
  });
});
