import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { withTestSite } from "#test/test-site-factory.js";

const markdownPage = (slug, content) => ({
  path: `pages/${slug}.md`,
  frontmatter: {
    name: slug,
    permalink: `/${slug}/`,
    blocks: [{ type: "markdown", content }],
  },
});

describe("raw HTML never reaches the front end", () => {
  test("indented HTML in markdown content renders as HTML across all built pages", async () => {
    const files = [
      markdownPage(
        "indented-html",
        'Filters below:\n\n    <ul>\n    <li><a href="/products#price-asc">Price: Low to High</a></li>\n    </ul>',
      ),
      markdownPage(
        "code-sample",
        "An intentional sample:\n\n```\n<ul><li>example</li></ul>\n```",
      ),
    ];

    // Escaped tags outside intentional code samples (pre/code/script
    // contents) mean raw HTML is being shown to visitors.
    const findEscapedTags = (html) =>
      html
        .replace(/<pre[\s>][\s\S]*?<\/pre>/gi, "")
        .replace(/<code[\s>][\s\S]*?<\/code>/gi, "")
        .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
        .match(/&lt;\/?[a-z][^&]{0,40}/gi);

    const walkHtmlFiles = (dir) =>
      fs
        .readdirSync(dir, { recursive: true })
        .filter((file) => file.endsWith(".html"))
        .map((file) => path.join(dir, file));

    await withTestSite({ files }, (site) => {
      const page = site.getOutput("indented-html/index.html");
      expect(page).toContain(
        '<a href="/products#price-asc">Price: Low to High</a>',
      );

      const codePage = site.getOutput("code-sample/index.html");
      expect(codePage).toContain("&lt;ul&gt;");

      for (const file of walkHtmlFiles(site.outputDir)) {
        const escaped = findEscapedTags(fs.readFileSync(file, "utf8"));
        expect(
          escaped,
          `Escaped HTML rendered to visitors in ${file}: ${escaped?.join(", ")}`,
        ).toBeNull();
      }
    });
  });
});
