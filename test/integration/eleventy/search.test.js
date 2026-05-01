import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

const contentFile = (collection, slug, title, extras = {}) => ({
  path: `${collection}/${slug}.md`,
  frontmatter: { title, ...extras },
  content: `${title} content.`,
});

describe("search", () => {
  test("product and category pages get data-pagefind-body, other pages do not", async () => {
    const files = [
      contentFile("products", "widget", "Widget"),
      contentFile("categories", "tools", "Tools"),
      contentFile("pages", "about", "About Us", { permalink: "/about/" }),
    ];

    await withTestSite({ files }, async (site) => {
      const productDoc = await site.getDoc("products/widget/index.html");
      expect(productDoc.querySelector("[data-pagefind-body]") !== null).toBe(
        true,
      );

      const categoryDoc = await site.getDoc("categories/tools/index.html");
      expect(categoryDoc.querySelector("[data-pagefind-body]") !== null).toBe(
        true,
      );

      const aboutDoc = await site.getDoc("about/index.html");
      expect(aboutDoc.querySelector("[data-pagefind-body]")).toBe(null);
    });
  });

  test("search page renders with search-box and results container", async () => {
    const files = [
      {
        path: "pages/search.md",
        frontmatter: {
          title: "Search",
          layout: "design-system-base.html",
          permalink: "/search/",
          blocks: [
            { type: "section-header", intro: "## Search" },
            { type: "content" },
          ],
        },
        content: [
          '<div data-pagefind-ignore>',
          '  {% include "search-box.html" %}',
          "",
          '  <div id="search-results">',
          '    <p class="search-message"></p>',
          '    <ul class="search-results-list"></ul>',
          '    <button class="search-load-more btn btn--secondary" hidden>Load more</button>',
          "  </div>",
          "</div>",
        ].join("\n"),
      },
    ];

    await withTestSite({ files }, async (site) => {
      const doc = await site.getDoc("search/index.html");

      expect(doc.querySelector(".search-box") !== null).toBe(true);
      expect(doc.querySelector("#search-results") !== null).toBe(true);
      expect(doc.querySelector(".search-results-list") !== null).toBe(true);
      expect(doc.querySelector(".search-load-more") !== null).toBe(true);
      expect(doc.querySelector("[data-pagefind-ignore]") !== null).toBe(true);
    });
  });

  test("search_collections config controls which pages are indexed", async () => {
    const files = [
      contentFile("products", "gadget", "Gadget"),
      contentFile("news", "2024-01-01-update", "Update"),
    ];

    await withTestSite(
      { files, config: { search_collections: ["products"] } },
      async (site) => {
        const productDoc = await site.getDoc("products/gadget/index.html");
        expect(productDoc.querySelector("[data-pagefind-body]") !== null).toBe(
          true,
        );

        const newsDoc = await site.getDoc("news/update/index.html");
        expect(newsDoc.querySelector("[data-pagefind-body]")).toBe(null);
      },
    );
  });
});
