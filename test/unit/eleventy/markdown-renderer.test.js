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

  test("a dash on a wrapped prose line does not start a list", () => {
    const html = createRenderer().render(
      "here's the first line and i want to add\n- that dash as part of the sentence but\nit is interpreted as a bullet",
    );
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("<li>");
    expect(html).toContain("- that dash as part of the sentence but");
  });

  test("a list still renders when preceded by a blank line", () => {
    const html = createRenderer().render(
      "intro paragraph\n\n- one\n- two\n- three",
    );
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
    expect(html).toContain("<li>three</li>");
  });

  test("a list at the very start of the content still renders", () => {
    const html = createRenderer().render("- one\n- two");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  test("nested lists without a blank line still render", () => {
    const html = createRenderer().render("- outer\n  - inner\n- outer2");
    expect(html).toContain("<li>inner</li>");
    expect(html).toContain("<li>outer2</li>");
    expect(html).toContain("<ul>\n<li>inner</li>");
  });
});
