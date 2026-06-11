import { describe, expect, test } from "bun:test";
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
  test("collection and static pages get data-pagefind-body, no_index pages do not", async () => {
    const files = [
      contentFile("products", "widget", "Widget"),
      contentFile("categories", "tools", "Tools"),
      contentFile("pages", "about", "About Us", { permalink: "/about/" }),
      contentFile("pages", "checkout", "Checkout", {
        permalink: "/checkout/",
        no_index: true,
      }),
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
      expect(aboutDoc.querySelector("[data-pagefind-body]") !== null).toBe(
        true,
      );

      const checkoutDoc = await site.getDoc("checkout/index.html");
      expect(checkoutDoc.querySelector("[data-pagefind-body]")).toBe(null);
    });
  });

  test("search page renders with search-box and results container", async () => {
    const files = [
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
      const doc = await site.getDoc("search/index.html");

      expect(doc.querySelector(".search-box") !== null).toBe(true);
      expect(doc.querySelector("#search-results") !== null).toBe(true);
      expect(doc.querySelector(".search-results-list") !== null).toBe(true);
      expect(doc.querySelector(".search-load-more") !== null).toBe(true);
      expect(doc.querySelector("[data-pagefind-ignore]") !== null).toBe(true);
    });
  });

  test("redirect stubs are not indexable and match the site language", async () => {
    const files = [
      contentFile("products", "widget", "Widget", {
        redirect_from: ["/old-widget/"],
      }),
    ];

    await withTestSite({ files }, async (site) => {
      const stubDoc = await site.getDoc("old-widget/index.html");
      expect(stubDoc.querySelector("[data-pagefind-body]")).toBe(null);

      const productDoc = await site.getDoc("products/widget/index.html");
      expect(stubDoc.documentElement.getAttribute("lang")).toBe(
        productDoc.documentElement.getAttribute("lang"),
      );
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
