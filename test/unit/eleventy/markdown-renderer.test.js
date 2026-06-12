import { describe, expect, test } from "bun:test";
import markdownIt from "markdown-it";
import { amendMarkdown } from "#eleventy/file-utils.js";

const createRenderer = () => {
  const md = new markdownIt({ html: true });
  amendMarkdown(md);
  return md;
};

describe("amendMarkdown", () => {
  test("indented HTML renders as HTML, not an escaped code block", () => {
    const html = createRenderer().render(
      'Intro text\n\n    <ul>\n    <li><a href="/products">Default</a></li>\n    </ul>\n',
    );
    expect(html).toContain('<a href="/products">Default</a>');
    expect(html).not.toContain("&lt;");
    expect(html).not.toContain("<code>");
  });

  test("fenced code blocks still render as escaped code", () => {
    const html = createRenderer().render(
      "```\n<ul><li>sample</li></ul>\n```\n",
    );
    expect(html).toContain("<pre><code>");
    expect(html).toContain("&lt;ul&gt;");
  });

  test("strips ++ markers from text", () => {
    const html = createRenderer().render("Hello ++world++");
    expect(html).toContain("Hello world");
    expect(html).not.toContain("++");
  });
});
