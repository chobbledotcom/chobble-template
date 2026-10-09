import MarkdownIt from "markdown-it";
import { describe, expect, test } from "vitest";
import {
  escapeText,
  fencedCode,
  inlineCode,
  markdownTable,
} from "#scripts/lib/markdown.js";
import { getTableRows } from "#test/test-utils.js";

const markdown = new MarkdownIt({ html: true });

describe("literal reference Markdown", () => {
  test.each([
    ">=22",
    "#utils/*",
    "src/_lib/utils/fp/array.js",
    "--color-link",
    "node scripts/build.js --ignore '**/*.js' && npm run check:links",
  ])("keeps ordinary code readable in Markdown source: %s", (text) => {
    expect(inlineCode(text)).toBe(`\`${text}\``);
  });

  test("leaves ordinary prose punctuation readable", () => {
    const text = "Full-width at 1.5rem (the default).";
    expect(escapeText(text)).toBe(text);
  });

  test.each([
    { rows: [] },
    {
      rows: [
        ["one", "two"],
        ["three", "four"],
      ],
    },
  ])("tables preserve their supplied rows: $rows", ({ rows }) => {
    const document = new DOMParser().parseFromString(
      markdown.render(markdownTable(["First", "Second"], rows)),
      "text/html",
    );
    expect(
      [...document.querySelectorAll("thead th")].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["First", "Second"]);
    expect(getTableRows(document)).toEqual(rows);
  });

  test.each([
    escapeText,
    inlineCode,
  ])("%s preserves literal GFM table content", (render) => {
    const text = "`code` \\| ~~deleted~~ **bold** _em_ [link](url) <img> &amp;";
    const document = new DOMParser().parseFromString(
      markdown.render(`| Value |\n| --- |\n| ${render(text)} |`),
      "text/html",
    );
    const cells = document.querySelectorAll("tbody td");
    expect(cells).toHaveLength(1);
    expect(cells[0].textContent).toBe(text);
    expect(cells[0].querySelectorAll("s, strong, em, a, img")).toHaveLength(0);
  });

  test.each([
    "# heading",
    "+ item",
    "- item",
    "1. item",
    "1) item",
    "---",
    "===",
    "> quote",
  ])("keeps block syntax literal: %s", (text) => {
    const document = new DOMParser().parseFromString(
      markdown.render(escapeText(text)),
      "text/html",
    );
    expect(document.body.children).toHaveLength(1);
    expect(document.body.firstElementChild.tagName).toBe("P");
    expect(document.body.firstElementChild.textContent).toBe(text);
  });

  test.each([
    " value ",
    "`",
    " ``value`` ",
    "  ",
    "\\|",
    "",
    "value|label",
    " value",
    "value ",
  ])("preserves inline code whitespace and delimiters: %j", (text) => {
    const document = new DOMParser().parseFromString(
      markdown.render(inlineCode(text)),
      "text/html",
    );
    expect(document.querySelector("code").textContent).toBe(text);
  });

  test.each([
    "\n",
    "\r",
    "\r\n",
  ])("renders a single line break for %j", (newline) => {
    const document = new DOMParser().parseFromString(
      markdown.render(inlineCode(`first${newline}second`)),
      "text/html",
    );
    expect(document.querySelectorAll("code br")).toHaveLength(1);
    expect(document.querySelector("code").textContent).toBe("firstsecond");
  });

  test.each([
    "plain",
    "```\n````\nend",
    "`````\n",
    "",
    "end\n\n",
  ])("preserves fenced content despite delimiter collisions: %j", (text) => {
    const tokens = markdown.parse(fencedCode(text, "text"), {});
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("fence");
    expect(tokens[0].info).toBe("text");
    expect(tokens[0].content).toBe(text.endsWith("\n") ? text : `${text}\n`);
  });
});
