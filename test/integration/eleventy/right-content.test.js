import { describe, expect, test } from "bun:test";
import { createTestSite, withTestSite } from "#test/test-site-factory.js";

const SIDEBAR_TEXT = "Sidebar contact details";
const PAGE_BLOCK = { type: "markdown", content: "Page body" };
const BANNER_BLOCK = {
  type: "image-background",
  image: "src/images/party.jpg",
  content: "Banner text",
};

const homePage = (blocks) => ({
  path: "pages/index.md",
  frontmatter: {
    name: "Home",
    permalink: "/",
    blocks,
  },
});

const rightContentSnippet = (blocks) => ({
  path: "snippets/right-content.md",
  frontmatter: { blocks },
});

const sidebarSnippet = () =>
  rightContentSnippet([{ type: "markdown", content: SIDEBAR_TEXT }]);

const bannerSiteOptions = (files) => ({
  images: [{ src: "test/fixtures/images/party.jpg", dest: "party.jpg" }],
  files,
});

/** Load the built homepage and locate its image-background banner */
const getRenderedBanner = async (site) => {
  const doc = await site.getDoc("index.html");
  const banner = doc.querySelector(".image-background");
  expect(banner).not.toBeNull();
  return { doc, banner };
};

describe("right-content sidebar", () => {
  test("renders the snippet's blocks in an aside outside main", async () => {
    await withTestSite(
      { files: [homePage([PAGE_BLOCK]), sidebarSnippet()] },
      async (site) => {
        const doc = await site.getDoc("index.html");

        expect(doc.body.classList.contains("two-columns")).toBe(true);

        const aside = doc.querySelector("aside.right-column");
        expect(aside).not.toBeNull();
        expect(aside.textContent).toContain(SIDEBAR_TEXT);
        expect(aside.classList.contains("design-system")).toBe(true);

        // Sibling of main inside the columns wrapper, never inside main —
        // keeps sidebar text out of the Pagefind index (data-pagefind-body
        // lives on main).
        const main = doc.querySelector("main");
        expect(main.querySelector("aside.right-column")).toBeNull();
        expect(main.textContent).not.toContain(SIDEBAR_TEXT);
        expect(aside.parentElement.classList.contains("page-columns")).toBe(
          true,
        );
        expect(main.parentElement).toBe(aside.parentElement);
      },
    );
  });

  test("renders plain markdown snippet content as a prose fallback", async () => {
    const markdownSnippet = {
      path: "snippets/right-content.md",
      frontmatter: {},
      content: `### Contact\n\n${SIDEBAR_TEXT}`,
    };
    await withTestSite(
      { files: [homePage([PAGE_BLOCK]), markdownSnippet] },
      async (site) => {
        const doc = await site.getDoc("index.html");
        const prose = doc.querySelector("aside.right-column .prose");
        expect(prose).not.toBeNull();
        expect(prose.textContent).toContain(SIDEBAR_TEXT);
      },
    );
  });

  test("without the snippet the body is one-column and has no aside", async () => {
    await withTestSite({ files: [homePage([PAGE_BLOCK])] }, async (site) => {
      const doc = await site.getDoc("index.html");
      expect(doc.body.classList.contains("one-column")).toBe(true);
      expect(doc.querySelector("aside.right-column")).toBeNull();
      // The wrapper div is always present so the DOM shape is stable.
      expect(doc.querySelector(".page-columns main")).not.toBeNull();
    });
  });

  test("a disallowed block type in the snippet fails the build", async () => {
    const site = await createTestSite({
      files: [
        homePage([PAGE_BLOCK]),
        rightContentSnippet([{ type: "hero", name: "Nope" }]),
      ],
    });
    try {
      await expect(site.build()).rejects.toThrow(
        'Block type "hero" is not supported inside the right-content sidebar',
      );
    } finally {
      site.cleanup();
    }
  });

  test("a leading image-background block is hoisted above the columns", async () => {
    await withTestSite(
      bannerSiteOptions([
        homePage([BANNER_BLOCK, PAGE_BLOCK]),
        sidebarSnippet(),
      ]),
      async (site) => {
        const { doc, banner } = await getRenderedBanner(site);
        // The banner is rendered before (and outside) the page-columns grid
        // so it spans content + sidebar.
        expect(banner.closest(".page-columns")).toBeNull();
        expect(banner.closest("main")).toBeNull();
        const columns = doc.querySelector(".page-columns");
        const bodyChildren = [...doc.body.children];
        expect(bodyChildren.indexOf(banner.closest("section"))).toBeLessThan(
          bodyChildren.indexOf(columns),
        );
        // The remaining blocks still render inside main.
        expect(doc.querySelector("main").textContent).toContain("Page body");
      },
    );
  });

  test("a leading image-background stays inside main without a sidebar", async () => {
    await withTestSite(
      bannerSiteOptions([homePage([BANNER_BLOCK])]),
      async (site) => {
        const { banner } = await getRenderedBanner(site);
        expect(banner.closest("main")).not.toBeNull();
      },
    );
  });
});
