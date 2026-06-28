import { describe, expect, test } from "bun:test";
import { createTestSite, useSharedSite } from "#test/test-site-factory.js";

const SIDEBAR_TEXT = "Sidebar contact details";
const PAGE_BLOCK = { type: "markdown", content: "Page body" };
const BANNER_BLOCK = {
  type: "image-background",
  image: "src/images/party.jpg",
  content: "Banner text",
};

const PARTY_IMAGE = {
  src: "test/fixtures/images/party.jpg",
  dest: "party.jpg",
};

const rightContentSnippet = (blocks) => ({
  path: "snippets/right-content.md",
  frontmatter: { blocks },
});

/** A standalone page carrying the given design-system blocks */
const pageWithBlocks = (slug, blocks) => ({
  path: `pages/${slug}.md`,
  frontmatter: { name: slug, permalink: `/${slug}/`, blocks },
});

/** Locate the image-background banner in a built document */
const findBanner = (doc) => {
  const banner = doc.querySelector(".image-background");
  expect(banner).not.toBeNull();
  return banner;
};

// The right-content sidebar is a single site-global snippet, so the aside
// renders identically on every page in a site. Each describe below builds one
// shared site per snippet configuration and serves several tests from it,
// instead of spawning a full Eleventy build per test.
describe("right-content sidebar", () => {
  describe("with a sidebar snippet", () => {
    // One snippet carrying both a markdown block and an items-array block, so
    // the block-rendering and items-array cases share a single build. A plain
    // page and a banner-led page exercise the two layout paths.
    const getSite = useSharedSite({
      images: [PARTY_IMAGE],
      files: [
        pageWithBlocks("plain", [PAGE_BLOCK]),
        pageWithBlocks("banner", [BANNER_BLOCK, PAGE_BLOCK]),
        {
          path: "pages/sidebar-item.md",
          frontmatter: { name: "Sidebar Item", permalink: "/sidebar-item/" },
        },
        rightContentSnippet([
          { type: "markdown", content: SIDEBAR_TEXT },
          { type: "items-array", items: ["src/pages/sidebar-item.md"] },
        ]),
      ],
    });

    test("renders the snippet's blocks in an aside outside main", async () => {
      const doc = await getSite().getDoc("plain/index.html");

      expect(doc.body.classList.contains("two-columns")).toBe(true);

      const aside = doc.querySelector("aside.right-column");
      expect(aside).not.toBeNull();
      expect(aside.textContent).toContain(SIDEBAR_TEXT);

      // Sibling of main inside the columns wrapper, never inside main —
      // keeps sidebar text out of the Pagefind index (data-pagefind-body
      // lives on main).
      const main = doc.querySelector("main");
      expect(main.querySelector("aside.right-column")).toBeNull();
      expect(main.textContent).not.toContain(SIDEBAR_TEXT);
      expect(aside.parentElement.classList.contains("page-columns")).toBe(true);
      expect(main.parentElement).toBe(aside.parentElement);
    });

    test("renders items-array blocks inside the aside", async () => {
      const doc = await getSite().getDoc("plain/index.html");
      const items = doc.querySelector("aside.right-column ul.items");

      expect(items).not.toBeNull();
      expect(items.closest("aside.right-column")).not.toBeNull();
      expect(items.querySelectorAll("li")).toHaveLength(1);
      expect(items.textContent).toContain("Sidebar Item");
    });

    test("a leading image-background block is hoisted above the columns", async () => {
      const doc = await getSite().getDoc("banner/index.html");
      const banner = findBanner(doc);
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
    });
  });

  describe("without a snippet", () => {
    const getSite = useSharedSite({
      images: [PARTY_IMAGE],
      files: [
        pageWithBlocks("plain", [PAGE_BLOCK]),
        pageWithBlocks("banner", [BANNER_BLOCK]),
      ],
    });

    test("the body is one-column and has no aside", async () => {
      const doc = await getSite().getDoc("plain/index.html");
      expect(doc.body.classList.contains("one-column")).toBe(true);
      expect(doc.querySelector("aside.right-column")).toBeNull();
      // The wrapper div is always present so the DOM shape is stable.
      expect(doc.querySelector(".page-columns main")).not.toBeNull();
    });

    test("a leading image-background stays inside main", async () => {
      const doc = await getSite().getDoc("banner/index.html");
      expect(findBanner(doc).closest("main")).not.toBeNull();
    });
  });

  describe("with a plain markdown snippet", () => {
    const getSite = useSharedSite({
      files: [
        pageWithBlocks("plain", [PAGE_BLOCK]),
        {
          path: "snippets/right-content.md",
          frontmatter: {},
          content: `### Contact\n\n${SIDEBAR_TEXT}`,
        },
      ],
    });

    test("renders plain markdown snippet content as a prose fallback", async () => {
      const doc = await getSite().getDoc("plain/index.html");
      const prose = doc.querySelector("aside.right-column .prose");
      expect(prose).not.toBeNull();
      expect(prose.textContent).toContain(SIDEBAR_TEXT);
    });
  });

  test("a disallowed block type in the snippet fails the build", async () => {
    const site = await createTestSite({
      files: [
        pageWithBlocks("plain", [PAGE_BLOCK]),
        rightContentSnippet([{ type: "hero", content: "Nope" }]),
      ],
    });
    try {
      await expect(site.build()).rejects.toThrow(
        'Block type "hero" is not supported inside the right-content sidebar',
      );
    } finally {
      site.cleanup();
    }
  }, 30_000);
});
