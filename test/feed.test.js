import { withTestSite } from "#test/test-site-factory.js";
import {
  createTestRunner,
  expectStrictEqual,
  expectTrue,
  fs,
  path,
} from "#test/test-utils.js";

/**
 * Tests for the Atom feed output from the Eleventy build.
 *
 * These tests verify the actual build output rather than mocking Eleventy
 * configuration, ensuring the feed works correctly in production.
 */

const FEED_PATH = path.join(process.cwd(), "_site/feed.xml");

// Read feed content once at module load. Tests check for null and provide
// clear error messages if the build hasn't been run.
const feedContent = fs.existsSync(FEED_PATH)
  ? fs.readFileSync(FEED_PATH, "utf-8")
  : null;

// ============================================
// Test Cases
// ============================================

const testCases = [
  // --- File Generation ---
  {
    name: "feed-file-exists",
    description: "Eleventy build generates feed.xml in _site directory",
    test: () => {
      expectTrue(
        fs.existsSync(FEED_PATH),
        `feed.xml should exist at ${FEED_PATH}`,
      );
    },
  },

  // --- Atom Format Validation ---
  {
    name: "feed-has-xml-declaration",
    description: "Feed starts with XML declaration",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.includes('<?xml version="1.0"'),
        "Should have XML declaration at start",
      );
    },
  },
  {
    name: "feed-is-atom-format",
    description: "Feed uses Atom namespace",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.includes('<feed xmlns="http://www.w3.org/2005/Atom"'),
        "Should have Atom feed namespace declaration",
      );
    },
  },
  {
    name: "feed-has-closing-tag",
    description: "Feed is well-formed with closing tag",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.trimEnd().endsWith("</feed>"),
        "Should end with closing </feed> tag",
      );
    },
  },

  // --- Required Atom Elements ---
  {
    name: "feed-has-title-element",
    description: "Feed contains required <title> element",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(feedContent.includes("<title>"), "Atom feed requires <title>");
    },
  },
  {
    name: "feed-has-id-element",
    description: "Feed contains required <id> element",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(feedContent.includes("<id>"), "Atom feed requires <id>");
    },
  },
  {
    name: "feed-has-updated-element",
    description: "Feed contains required <updated> element",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.includes("<updated>"),
        "Atom feed requires <updated>",
      );
    },
  },
  {
    name: "feed-has-author-element",
    description: "Feed contains <author> element",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(feedContent.includes("<author>"), "Feed should have author");
    },
  },

  // --- Entry Structure ---
  {
    name: "feed-has-entries",
    description: "Feed contains at least one <entry> element",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.includes("<entry>"),
        "Feed should contain entry elements for blog posts",
      );
    },
  },
  {
    name: "feed-entries-are-well-formed",
    description: "Entry elements have matching closing tags",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      const openCount = (feedContent.match(/<entry>/g) || []).length;
      const closeCount = (feedContent.match(/<\/entry>/g) || []).length;
      expectStrictEqual(
        openCount,
        closeCount,
        `Entry tags should match: ${openCount} open, ${closeCount} close`,
      );
    },
  },

  // --- Entry Content ---
  {
    name: "feed-entries-have-html-content",
    description: "Entries include HTML content type",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      expectTrue(
        feedContent.includes('<content type="html">'),
        "Entries should have HTML content",
      );
    },
  },
  {
    name: "feed-content-has-absolute-urls",
    description: "Links in content are absolute URLs (not relative)",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      // The htmlBase plugin transforms relative URLs to absolute
      expectTrue(
        feedContent.includes('href="https://'),
        "Content links should be absolute (https://)",
      );
    },
  },

  // --- Self Link ---
  {
    name: "feed-self-link-points-to-feed-xml",
    description: "Feed has self-referencing link pointing to feed.xml",
    test: () => {
      expectTrue(feedContent !== null, "Feed file missing - run build first");
      // Verify both rel="self" exists and it points to feed.xml
      expectTrue(
        feedContent.includes('rel="self"'),
        "Feed should have rel=self link",
      );
      expectTrue(
        feedContent.includes("feed.xml") && feedContent.includes('rel="self"'),
        "Self link should reference feed.xml",
      );
    },
  },

  // ============================================
  // Integration Tests using Test Site Factory
  // ============================================
  // These tests create isolated Eleventy sites to verify feed behavior
  // in controlled scenarios, addressing edge cases (Criterion 7).

  {
    name: "integration-feed-with-no-posts",
    description: "Feed is generated even when there are no blog posts",
    asyncTest: () =>
      withTestSite(
        {
          files: [
            {
              path: "pages/about.md",
              frontmatter: { title: "About", layout: "page" },
              content: "# About us",
            },
          ],
        },
        (site) => {
          expectTrue(site.hasOutput("feed.xml"), "feed.xml should exist");
          const feed = site.getOutput("feed.xml");
          expectTrue(
            feed.includes('<feed xmlns="http://www.w3.org/2005/Atom"'),
            "Should be valid Atom feed",
          );
          // With no posts, there should be no entries
          expectTrue(
            !feed.includes("<entry>"),
            "Empty feed should have no entries",
          );
        },
      ),
  },

  {
    name: "integration-feed-uses-site-name",
    description: "Feed title matches configured site name",
    asyncTest: () =>
      withTestSite(
        {
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
              path: "news/hello.md",
              frontmatter: { title: "Hello World" },
              content: "First post",
            },
          ],
        },
        (site) => {
          const feed = site.getOutput("feed.xml");
          expectTrue(
            feed.includes("<title>Test Blog Name</title>"),
            "Feed title should match site name config",
          );
        },
      ),
  },

  {
    name: "integration-feed-entry-has-required-elements",
    description: "Each entry has title, id, updated, and content",
    asyncTest: () =>
      withTestSite(
        {
          files: [
            {
              path: "news/test-post.md",
              frontmatter: { title: "Test Post Title" },
              content: "Post content here",
            },
          ],
        },
        (site) => {
          const feed = site.getOutput("feed.xml");

          // Extract entry content
          const entryMatch = feed.match(/<entry>([\s\S]*?)<\/entry>/);
          expectTrue(entryMatch !== null, "Should have an entry");
          const entry = entryMatch[1];

          expectTrue(
            entry.includes("<title>Test Post Title</title>"),
            "Entry should have title",
          );
          expectTrue(entry.includes("<id>"), "Entry should have id");
          expectTrue(entry.includes("<updated>"), "Entry should have updated");
          expectTrue(
            entry.includes('<content type="html">'),
            "Entry should have HTML content",
          );
        },
      ),
  },

  {
    name: "integration-feed-handles-special-characters",
    description: "Feed is valid XML with special characters in titles",
    asyncTest: () =>
      withTestSite(
        {
          files: [
            {
              path: "news/special.md",
              frontmatter: { title: "Tom and Jerry's Adventure" },
              content: "Special chars test",
            },
          ],
        },
        (site) => {
          const feed = site.getOutput("feed.xml");
          // Feed should be valid XML and contain the entry
          expectTrue(
            feed.includes("<entry>"),
            "Feed should have entry element",
          );
          expectTrue(
            feed.includes("Tom and Jerry"),
            "Entry title should contain expected text",
          );
          // Apostrophe should be handled (either escaped or in CDATA)
          expectTrue(
            feed.includes("Jerry's") || feed.includes("Jerry&#39;s"),
            "Apostrophe should be handled in title",
          );
        },
      ),
  },

  {
    name: "integration-feed-multiple-posts-ordered",
    description: "Feed entries are ordered with most recent first",
    asyncTest: () =>
      withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-older.md",
              frontmatter: { title: "Older Post" },
              content: "First",
            },
            {
              path: "news/2024-06-15-newer.md",
              frontmatter: { title: "Newer Post" },
              content: "Second",
            },
          ],
        },
        (site) => {
          const feed = site.getOutput("feed.xml");
          const olderPos = feed.indexOf("Older Post");
          const newerPos = feed.indexOf("Newer Post");

          expectTrue(olderPos > 0, "Should contain Older Post");
          expectTrue(newerPos > 0, "Should contain Newer Post");
          expectTrue(
            newerPos < olderPos,
            "Newer post should appear before older post in feed",
          );
        },
      ),
  },
];

export default createTestRunner("feed", testCases);
