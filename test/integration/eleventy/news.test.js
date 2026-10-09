import { describe, expect, test } from "vitest";
import { useSharedSite } from "#test/test-site-factory.js";
import { normaliseSlug } from "#utils/slug-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a news post file for test site
 * @param {string} slug - Post slug (without date prefix)
 * @param {string} name - Post name
 * @param {Object} options - Additional frontmatter (author, etc.)
 */
const newsPostFile = (slug, name, extras = {}) => ({
  path: `news/2024-01-01-${slug}.md`,
  frontmatter: {
    name,
    blocks: [
      { type: "include", file: "news-post-header.html" },
      { type: "news-meta" },
      { type: "markdown", content: `Content for ${name}.` },
      { type: "include", file: "news-post-gallery.html" },
      { type: "include", file: "faq.html" },
    ],
    ...extras,
  },
  content: "",
});

/**
 * Get post meta element from a news post page
 */
const getPostMeta = async (site, slug) => {
  const doc = await site.getDoc(`/news/${slug}/index.html`);
  return doc.querySelector('[role="doc-subtitle"]');
};

/**
 * Get content HTML from a news post page
 */
const getContentHtml = async (site, slug) => {
  const doc = await site.getDoc(`/news/${slug}/index.html`);
  const main = doc.querySelector("main");
  return main ? main.innerHTML : "";
};

/**
 * Assert post meta has time element with datetime attribute
 */
const expectTimeElement = (postMeta) => {
  expect(postMeta.querySelector("time") !== null).toBe(true);
  expect(postMeta.querySelector("time").hasAttribute("datetime")).toBe(true);
};

describe("news", () => {
  // normaliseSlug unit tests
  test("Returns simple slug unchanged", () => {
    expect(normaliseSlug("jane-doe")).toBe("jane-doe");
  });

  test("Extracts slug from full path reference", () => {
    expect(normaliseSlug("src/team/jane-doe.md")).toBe("jane-doe");
  });

  test("Removes file extension from slug", () => {
    expect(normaliseSlug("jane-doe.md")).toBe("jane-doe");
  });

  test("Throws on null input", () => {
    expect(() => normaliseSlug(null)).toThrow("requires a non-empty string");
  });

  test("Throws on undefined input", () => {
    expect(() => normaliseSlug(undefined)).toThrow(
      "requires a non-empty string",
    );
  });

  // Integration tests with test site. Author rendering and no_index archive
  // behaviour are independent, so one shared build with all the post fixtures
  // covers both — the extra posts don't affect either assertion set.
  describe("built site", () => {
    const files = [
      // Post with a plain-text author
      newsPostFile("with-author", "Post With Author", { author: "Jane Doe" }),

      // Post without author
      newsPostFile("no-author", "Post Without Author"),

      // Visible and no_index posts for the archive assertions
      newsPostFile("visible-post", "Visible Post Title"),
      newsPostFile("hidden-post", "Hidden Post Title", { no_index: true }),

      // News archive page
      {
        path: "pages/news.md",
        frontmatter: {
          name: "News",
          permalink: "/news/",
          blocks: [
            { type: "markdown", content: "News archive page" },
            { type: "items", collection: "news", image_aspect_ratio: "4/3" },
          ],
        },
        content: "",
      },
    ];
    const getSite = useSharedSite({ files });

    test("Post meta renders correctly with and without an author", async () => {
      const site = getSite();

      // Post with author renders a byline plus date with semantic HTML
      const metaWithAuthor = await getPostMeta(site, "with-author");
      expect(metaWithAuthor !== null).toBe(true);
      expect(metaWithAuthor.querySelector("address") !== null).toBe(true);
      expectTimeElement(metaWithAuthor);
      expect(metaWithAuthor.tagName.toLowerCase()).toBe("div");
      expect(metaWithAuthor.getAttribute("role")).toBe("doc-subtitle");

      // The author name renders as plain text, not a link
      const htmlWithAuthor = await getContentHtml(site, "with-author");
      expect(htmlWithAuthor.includes("Jane Doe")).toBe(true);
      expect(htmlWithAuthor.includes('rel="author"')).toBe(false);

      // Post without author renders simple date-only layout
      const metaNoAuthor = await getPostMeta(site, "no-author");
      expect(metaNoAuthor !== null).toBe(true);
      expect(metaNoAuthor.querySelector("address")).toBe(null);
      expectTimeElement(metaNoAuthor);
    });

    test("Posts with no_index are correctly excluded from archive and marked for search engines", async () => {
      const site = getSite();

      // Test 1: no_index post renders as standalone page
      expect(site.hasOutput("/news/hidden-post/index.html")).toBe(true);
      const hiddenHtml = await getContentHtml(site, "hidden-post");
      expect(hiddenHtml.includes("Hidden Post Title")).toBe(true);

      // Test 2: no_index post has noindex meta tag
      const hiddenOutput = site.getOutput("/news/hidden-post/index.html");
      expect(hiddenOutput).toContain(
        '<meta name="robots" content="noindex,nofollow">',
      );
      expect(hiddenOutput).not.toContain('name="robots" value=');

      // Test 3: no_index post does not appear in news list
      const newsListHtml = site.getOutput("/news/index.html");
      expect(newsListHtml.includes("Visible Post Title")).toBe(true);
      expect(newsListHtml.includes("Hidden Post Title")).toBe(false);
    });
  });
});
