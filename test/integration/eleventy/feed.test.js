import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestSite } from "#test/test-site-factory.js";

// Test the actual feed output using isolated test sites
// Tests are grouped to minimize builds while maintaining test isolation

// Factory: setup and teardown a test site within a describe block
const setupTestSiteWithFeed = (siteOptions) => {
  let site;
  let feed;

  beforeAll(async () => {
    site = await createTestSite(siteOptions);
    await site.build();
    feed = site.getOutput("feed.xml");
  });

  afterAll(() => site?.cleanup());

  return { getSite: () => site, getFeed: () => feed };
};

describe("feed", () => {
  // --- Comprehensive test site (covers most feed tests) ---
  // Single build for tests that can share the same content
  describe("comprehensive site", () => {
    const { getSite, getFeed } = setupTestSiteWithFeed({
      dataFiles: [
        {
          filename: "site.json",
          data: {
            name: "Test Blog Name",
            url: "https://test.example.com",
            description: "Test site",
          },
        },
      ],
      files: [
        {
          path: "news/2024-01-01-older.md",
          frontmatter: { title: "Older Post" },
          content: "Check out [our homepage](/) for more info.",
        },
        {
          path: "news/2024-06-15-newer.md",
          frontmatter: { title: "Newer Post" },
          content: "Second post content.",
        },
        {
          path: "news/special.md",
          frontmatter: { title: "Tom and Jerry's Adventure" },
          content: "Special chars test",
        },
      ],
    });

    test("Feed is generated with valid Atom XML structure and content", () => {
      // File generation and structure validation
      expect(getSite().hasOutput("feed.xml")).toBe(true);
      const feed = getFeed();
      expect(feed.includes('<?xml version="1.0"')).toBe(true);
      expect(feed.includes('<feed xmlns="http://www.w3.org/2005/Atom"')).toBe(
        true,
      );
      expect(feed.includes("</feed>")).toBe(true);

      // Required Atom elements
      expect(feed.includes("<title>Test Blog Name</title>")).toBe(true);
      expect(feed.includes("<id>")).toBe(true);
      expect(feed.includes("<updated>")).toBe(true);
      expect(feed.includes("<author>")).toBe(true);
      expect(feed.includes('rel="self"')).toBe(true);
      expect(feed.includes("/feed.xml")).toBe(true);
    });

    test("Feed contains blog post entries with correct ordering and content", () => {
      const feed = getFeed();

      // Entry elements exist and contain posts
      expect(feed.includes("<entry>")).toBe(true);
      expect(feed.includes("</entry>")).toBe(true);
      expect(feed.includes("Older Post")).toBe(true);
      expect(feed.includes("Newer Post")).toBe(true);

      // Entries have proper content and absolute URLs
      expect(feed.includes('<content type="html">')).toBe(true);
      expect(feed.includes('href="https://')).toBe(true);

      // Most recent post appears first
      const olderPos = feed.indexOf("Older Post");
      const newerPos = feed.indexOf("Newer Post");
      expect(olderPos > 0 && newerPos > 0 && newerPos < olderPos).toBe(true);
    });

    test("Feed handles special characters correctly", () => {
      const feed = getFeed();
      expect(feed.includes("Tom and Jerry")).toBe(true);
      // Apostrophe should be handled (either escaped or in CDATA)
      expect(feed.includes("Jerry's") || feed.includes("Jerry&#39;s")).toBe(
        true,
      );
    });
  });

  // --- Edge case: No posts site (needs separate build) ---
  describe("with no posts", () => {
    const { getSite, getFeed } = setupTestSiteWithFeed({
      files: [
        {
          path: "pages/about.md",
          frontmatter: { title: "About", layout: "page" },
          content: "# About us",
        },
      ],
    });

    test("Feed is generated even when there are no blog posts", () => {
      expect(getSite().hasOutput("feed.xml")).toBe(true);
      expect(
        getFeed().includes('<feed xmlns="http://www.w3.org/2005/Atom"'),
      ).toBe(true);
      // With no posts, there should be no entries
      expect(!getFeed().includes("<entry>")).toBe(true);
    });
  });
});
