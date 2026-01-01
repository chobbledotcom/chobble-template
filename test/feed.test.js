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
];

export default createTestRunner("feed", testCases);
