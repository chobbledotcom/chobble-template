import { describe, expect, test } from "vitest";
import { withTestSite } from "#test/test-site-factory.js";

const contentFile = (collection, slug, name, extras = {}) => ({
  path: `${collection}/${slug}.md`,
  frontmatter: {
    name,
    blocks: [{ type: "markdown", content: `${name} content.` }],
    ...extras,
  },
  content: "",
});

describe("search", () => {
  test("search pages and indexing rules render correctly", async () => {
    const files = [
      contentFile("news", "2024-01-01-widget-post", "Widget Post", {
        redirect_from: ["/old-widget/"],
      }),
      contentFile("pages", "about", "About Us", { permalink: "/about/" }),
      contentFile("guide-categories", "getting-started", "Getting Started"),
      contentFile("guide-pages", "introduction", "Introduction", {
        "guide-category": "getting-started",
      }),
      contentFile("pages", "internal", "Internal", {
        permalink: "/internal/",
        no_index: true,
      }),
      {
        path: "pages/search.md",
        frontmatter: {
          name: "Search",
          permalink: "/search/",
          blocks: [
            { type: "section-header", intro: "## Search" },
            { type: "include", file: "search-box.html" },
            {
              type: "html",
              content: [
                "<div data-pagefind-ignore>",
                '  <div id="search-results">',
                '    <p class="search-message"></p>',
                '    <ul class="search-results-list"></ul>',
                '    <button class="search-load-more btn btn--secondary" hidden>Load more</button>',
                "  </div>",
                "</div>",
              ].join("\n"),
            },
          ],
        },
        content: "",
      },
    ];

    await withTestSite({ files }, async (site) => {
      const newsDoc = await site.getDoc("news/widget-post/index.html");
      expect(newsDoc.querySelector("[data-pagefind-body]") !== null).toBe(true);

      const aboutDoc = await site.getDoc("about/index.html");
      expect(aboutDoc.querySelector("[data-pagefind-body]") !== null).toBe(
        true,
      );

      const guideCategoryDoc = await site.getDoc(
        "guide/getting-started/index.html",
      );
      expect(
        guideCategoryDoc.querySelector("[data-pagefind-body]") !== null,
      ).toBe(true);

      const guidePageDoc = await site.getDoc(
        "guide/getting-started/introduction/index.html",
      );
      expect(guidePageDoc.querySelector("[data-pagefind-body]") !== null).toBe(
        true,
      );

      const internalDoc = await site.getDoc("internal/index.html");
      expect(internalDoc.querySelector("[data-pagefind-body]")).toBe(null);

      const searchDoc = await site.getDoc("search/index.html");
      expect(searchDoc.querySelector(".search-box") !== null).toBe(true);
      expect(searchDoc.querySelector("#search-results") !== null).toBe(true);
      expect(searchDoc.querySelector(".search-results-list") !== null).toBe(
        true,
      );
      expect(searchDoc.querySelector(".search-load-more") !== null).toBe(true);
      expect(searchDoc.querySelector("[data-pagefind-ignore]") !== null).toBe(
        true,
      );

      const stubDoc = await site.getDoc("old-widget/index.html");
      expect(stubDoc.querySelector("[data-pagefind-body]")).toBe(null);
      expect(stubDoc.documentElement.getAttribute("lang")).toBe(
        newsDoc.documentElement.getAttribute("lang"),
      );
    });
  }, 30_000);

  // How `search_collections` decides which pages are indexed is pure logic
  // owned by eleventyComputed.pagefind_body and covered by its unit tests in
  // test/unit/data/eleventy-computed/search-nav.test.js (including the
  // tag-not-in-collections and no_index cases). The test above already proves
  // that computed value is wired into the rendered output, so a second full
  // build that only varies the config adds no coverage.
});
