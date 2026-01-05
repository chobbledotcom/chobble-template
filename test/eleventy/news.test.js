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

  test("Returns null for null input", () => {
    expect(normaliseSlug(null)).toBe(null);
  });

  test("Returns undefined for undefined input", () => {
    expect(normaliseSlug(undefined)).toBe(undefined);
  });

  // Integration tests with test site
  test("News post with author renders author link in HTML", async () => {
    const files = [
      newsPost("test-post", "Test Post With Author", { author: "jane-doe" }),
      teamMember("jane-doe", "Jane Doe"),
    ];

    await withTestSite({ files }, (site) => {
      const html = getContentHtml(site, "test-post");

      expect(html.includes('href="/team/jane-doe/"')).toBe(true);
      expect(html.includes("Jane Doe")).toBe(true);
    });
  });

  test("News post without author does not render author section", async () => {
    const files = [newsPost("no-author", "Test Post Without Author")];

    await withTestSite({ files }, (site) => {
      const html = getContentHtml(site, "no-author");

      expect(html.includes('href="/team/')).toBe(false);
    });
  });

  test("News post with author that has image renders grid layout with thumbnail", async () => {
    const files = [
      newsPost("thumbnail-post", "Post With Author Thumbnail", {
        author: "jane-doe",
      }),
      teamMember("jane-doe", "Jane Doe", { image: "placeholder-square-1.jpg" }),
    ];

    await withTestSite({ files, images: extractImages(files) }, (site) => {
      const postMeta = getPostMeta(site, "thumbnail-post");

      expectMetaStructure(postMeta, { hasThumbnail: true, hasFigure: true });
      expect(postMeta.querySelector("figure a") !== null).toBe(true);
      expectAuthorElements(postMeta);
      expectTimeElement(postMeta);
    });
  });

  test("News post with author but no image renders without thumbnail class", async () => {
    const files = [
      newsPost("no-thumb-post", "Post With Author No Thumbnail", {
        author: "john-smith",
      }),
      teamMember("john-smith", "John Smith"),
    ];

    await withTestSite({ files }, (site) => {
      const postMeta = getPostMeta(site, "no-thumb-post");

      expectMetaStructure(postMeta, { hasThumbnail: false, hasFigure: false });
      expectAuthorElements(postMeta);
      expect(postMeta.querySelector("time") !== null).toBe(true);
    });
  });

  test("News post without author renders simple date-only layout", async () => {
    const files = [newsPost("anonymous-post", "Anonymous Post")];

    await withTestSite({ files }, (site) => {
      const postMeta = getPostMeta(site, "anonymous-post");

      expectMetaStructure(postMeta, { hasThumbnail: false, hasFigure: false });
      expect(postMeta.querySelector("address")).toBe(null);
      expectTimeElement(postMeta);
    });
  });

  test("Post meta uses semantic HTML with proper roles", async () => {
    const files = [
      newsPost("semantic-test", "Semantic HTML Test", { author: "jane-doe" }),
      teamMember("jane-doe", "Jane Doe", { image: "placeholder-square-1.jpg" }),
    ];

    await withTestSite({ files, images: extractImages(files) }, (site) => {
      const postMeta = getPostMeta(site, "semantic-test");

      expect(postMeta.tagName.toLowerCase()).toBe("header");
      expect(postMeta.getAttribute("role")).toBe("doc-subtitle");
    });
  });
});
