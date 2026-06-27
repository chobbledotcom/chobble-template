import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createTestSite, withTestSite } from "#test/test-site-factory.js";

/** Build a page file fixture whose body lives in a markdown block */
const pageFile = (slug, name, extras = {}) => ({
  path: `pages/${slug}.md`,
  frontmatter: {
    name,
    permalink: `/${slug}/`,
    blocks: [{ type: "markdown", content: `${name} page` }],
    ...extras,
  },
});

describe("sitemap", () => {
  test("sitemap is generated, includes regular pages, and excludes no_index pages", async () => {
    await withTestSite(
      {
        files: [
          pageFile("about", "About"),
          pageFile("visible", "Visible"),
          pageFile("hidden", "Hidden", { no_index: true }),
          pageFile("secret", "Secret Page", { no_index: true }),
        ],
      },
      (site) => {
        expect(site.hasOutput("sitemap.xml")).toBe(true);

        const sitemap = site.getOutput("sitemap.xml");
        expect(sitemap.includes("/about/")).toBe(true);
        expect(sitemap.includes("/visible/")).toBe(true);
        expect(sitemap.includes("/hidden/")).toBe(false);

        expect(site.hasOutput("secret/index.html")).toBe(true);
        const html = site.getOutput("secret/index.html");
        expect(html.includes("Secret Page")).toBe(true);
      },
    );
  });

  test("sitemap escapes ampersands in URLs", async () => {
    await withTestSite(
      {
        files: [pageFile("q", "Query", { permalink: "/search/?q=cats&p=1" })],
      },
      (site) => {
        const sitemap = site.getOutput("sitemap.xml");
        // Raw `&` would make the sitemap invalid XML; it must be escaped.
        expect(sitemap.includes("?q=cats&amp;p=1")).toBe(true);
        expect(sitemap.includes("?q=cats&p=1")).toBe(false);
      },
    );
  });

  test("sitemap includes lastmod from git dates", async () => {
    const site = await createTestSite({
      files: [pageFile("about", "About")],
    });

    try {
      execFileSync("git", ["init", "--quiet"], { cwd: site.dir });
      execFileSync("git", ["config", "user.email", "test@test.com"], {
        cwd: site.dir,
      });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: site.dir });
      execFileSync("git", ["add", "-A"], { cwd: site.dir });
      execFileSync(
        "git",
        ["commit", "-m", "initial", "--allow-empty", "--quiet"],
        { cwd: site.dir },
      );

      await site.build();

      const sitemap = site.getOutput("sitemap.xml");
      expect(sitemap.includes("/about/")).toBe(true);
      expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    } finally {
      site.cleanup();
    }
  });
});
