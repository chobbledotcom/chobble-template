import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";
import { filter, pipe } from "#utils/array-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a news post file for test site
 * @param {string} slug - Post slug (without date prefix)
 * @param {string} title - Post title
 * @param {Object} options - Additional frontmatter (author, etc.)
 */
const newsPost = (slug, title, { author, ...extras } = {}) => ({
  path: `news/2024-01-01-${slug}.md`,
  frontmatter: {
    title,
    ...(author && { author: `src/team/${author}.md` }),
    ...extras,
  },
  content: `Content for ${title}.`,
});

/**
 * Create a team member file for test site
 * @param {string} slug - Team member slug
 * @param {string} name - Team member name
 * @param {Object} options - Additional frontmatter (image, snippet, etc.)
 */
const teamMember = (slug, name, { image, ...extras } = {}) => ({
  path: `team/${slug}.md`,
  frontmatter: {
    title: name,
    snippet: extras.snippet ?? `${name} bio snippet`,
    ...(image && { image: `src/images/${image}` }),
    ...extras,
  },
  content: `${name} bio.`,
});

/**
 * Get post meta element from a news post page
 */
const getPostMeta = (site, slug) => {
  const doc = site.getDoc(`/news/${slug}/index.html`);
  return doc.querySelector(".post-meta");
};

/**
 * Get content HTML from a news post page
 */
const getContentHtml = (site, slug) => {
  const doc = site.getDoc(`/news/${slug}/index.html`);
  const content = doc.getElementById("content");
  return content ? content.innerHTML : "";
};

/**
 * Extract images from test files (for images array)
 */
const extractImages = pipe(
  filter((file) => file.frontmatter?.image),
  (files) => files.map((f) => f.frontmatter.image.replace("src/images/", "")),
);

/**
 * Assert post meta has expected elements for posts with authors
 */
const expectAuthorElements = (postMeta) => {
  expect(postMeta.querySelector("address") !== null).toBe(true);
  expect(postMeta.querySelector('a[rel="author"]') !== null).toBe(true);
};

/**
 * Assert post meta has time element with datetime attribute
 */
const expectTimeElement = (postMeta) => {
  expect(postMeta.querySelector("time") !== null).toBe(true);
  expect(postMeta.querySelector("time").hasAttribute("datetime")).toBe(true);
};

/**
 * Assert post meta base structure (exists, thumbnail class, figure)
 */
const expectMetaStructure = (postMeta, { hasThumbnail, hasFigure }) => {
  expect(postMeta !== null).toBe(true);
  expect(postMeta.classList.contains("with-thumbnail")).toBe(hasThumbnail);
  hasFigure
    ? expect(postMeta.querySelector("figure") !== null).toBe(true)
    : expect(postMeta.querySelector("figure")).toBe(null);
};

describe("news", () => {
  // Integration tests with test site - consolidated to single build
  test("Post meta renders correctly with various author/image combinations and handles no_index", async () => {
    const files = [
      // Post with author + image
      newsPost("with-author-image", "Post With Author and Image", {
        author: "jane-doe",
      }),
      teamMember("jane-doe", "Jane Doe", { image: "placeholder-square-1.jpg" }),

      // Post with author but no image
      newsPost("with-author-no-image", "Post With Author No Image", {
        author: "john-smith",
      }),
      teamMember("john-smith", "John Smith"),

      // Post without author
      newsPost("no-author", "Post Without Author"),

      // Visible post
      newsPost("visible-post", "Visible Post Title"),

      // Hidden post with no_index
      newsPost("hidden-post", "Hidden Post Title", { no_index: true }),

      // News archive page
      {
        path: "pages/news.md",
        frontmatter: {
          title: "News",
          layout: "news-archive.html",
          permalink: "/news/",
        },
        content: "News archive page",
      },
    ];

    await withTestSite({ files, images: extractImages(files) }, (site) => {
      // Test 1: Post with author + image renders thumbnail layout with semantic HTML
      const metaWithImage = getPostMeta(site, "with-author-image");
      expectMetaStructure(metaWithImage, {
        hasThumbnail: true,
        hasFigure: true,
      });
      expect(metaWithImage.querySelector("figure a") !== null).toBe(true);
      expectAuthorElements(metaWithImage);
      expectTimeElement(metaWithImage);
      expect(metaWithImage.tagName.toLowerCase()).toBe("header");
      expect(metaWithImage.getAttribute("role")).toBe("doc-subtitle");

      // Test 2: Post with author link renders in HTML content
      const htmlWithAuthor = getContentHtml(site, "with-author-image");
      expect(htmlWithAuthor.includes('href="/team/jane-doe/"')).toBe(true);
      expect(htmlWithAuthor.includes("Jane Doe")).toBe(true);

      // Test 3: Post with author but no image renders without thumbnail
      const metaNoImage = getPostMeta(site, "with-author-no-image");
      expectMetaStructure(metaNoImage, {
        hasThumbnail: false,
        hasFigure: false,
      });
      expectAuthorElements(metaNoImage);
      expectTimeElement(metaNoImage);

      // Test 4: Post without author does not render author section
      const htmlNoAuthor = getContentHtml(site, "no-author");
      expect(htmlNoAuthor.includes('href="/team/')).toBe(false);

      // Test 5: Post without author renders simple date-only layout
      const metaNoAuthor = getPostMeta(site, "no-author");
      expectMetaStructure(metaNoAuthor, {
        hasThumbnail: false,
        hasFigure: false,
      });
      expect(metaNoAuthor.querySelector("address")).toBe(null);
      expectTimeElement(metaNoAuthor);

      // Test 6: no_index post renders as standalone page
      expect(site.hasOutput("/news/hidden-post/index.html")).toBe(true);
      const hiddenHtml = getContentHtml(site, "hidden-post");
      expect(hiddenHtml.includes("Hidden Post Title")).toBe(true);

      // Test 7: no_index post has noindex meta tag
      const hiddenOutput = site.getOutput("/news/hidden-post/index.html");
      expect(hiddenOutput.includes('name="robots"')).toBe(true);
      expect(hiddenOutput.includes("noindex")).toBe(true);

      // Test 8: no_index post does not appear in news list
      const newsListHtml = site.getOutput("/news/index.html");
      expect(newsListHtml.includes("Visible Post Title")).toBe(true);
      expect(newsListHtml.includes("Hidden Post Title")).toBe(false);
    });
  });
});
