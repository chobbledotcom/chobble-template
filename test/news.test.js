import { withTestSite } from "#test/test-site-factory.js";
import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

const testCases = [
  {
    name: "normaliseSlug-simple",
    description: "Returns simple slug unchanged",
    test: () => {
      const result = normaliseSlug("jane-doe");
      expectStrictEqual(
        result,
        "jane-doe",
        "Should return simple slug unchanged",
      );
    },
  },
  {
    name: "normaliseSlug-with-path",
    description: "Extracts slug from full path reference",
    test: () => {
      const result = normaliseSlug("src/team/jane-doe.md");
      expectStrictEqual(result, "jane-doe", "Should extract slug from path");
    },
  },
  {
    name: "normaliseSlug-with-extension",
    description: "Removes file extension from slug",
    test: () => {
      const result = normaliseSlug("jane-doe.md");
      expectStrictEqual(result, "jane-doe", "Should remove file extension");
    },
  },
  {
    name: "normaliseSlug-null",
    description: "Returns null for null input",
    test: () => {
      const result = normaliseSlug(null);
      expectStrictEqual(result, null, "Should return null for null input");
    },
  },
  {
    name: "normaliseSlug-undefined",
    description: "Returns undefined for undefined input",
    test: () => {
      const result = normaliseSlug(undefined);
      expectStrictEqual(
        result,
        undefined,
        "Should return undefined for undefined input",
      );
    },
  },
  {
    name: "news-author-rendered-with-link",
    description: "News post with author renders author link in HTML",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-test-post.md",
              frontmatter: {
                title: "Test Post With Author",
                author: "src/team/jane-doe.md",
              },
              content: "This is a test post with an author.",
            },
            {
              path: "team/jane-doe.md",
              frontmatter: {
                title: "Jane Doe",
                snippet: "Test team member",
              },
              content: "Jane Doe bio.",
            },
          ],
        },
        (site) => {
          const doc = site.getDoc("/news/test-post/index.html");
          const content = doc.getElementById("content");
          const contentHtml = content ? content.innerHTML : "";

          expectStrictEqual(
            contentHtml.includes('href="/team/jane-doe/"'),
            true,
            "Should include link to author's team page",
          );
          expectStrictEqual(
            contentHtml.includes("Jane Doe"),
            true,
            "Should include author's name",
          );
        },
      );
    },
  },
  {
    name: "news-without-author-no-link",
    description: "News post without author does not render author section",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-no-author.md",
              frontmatter: {
                title: "Test Post Without Author",
              },
              content: "This is a test post without an author.",
            },
          ],
        },
        (site) => {
          const doc = site.getDoc("/news/no-author/index.html");
          const content = doc.getElementById("content");
          const contentHtml = content ? content.innerHTML : "";

          expectStrictEqual(
            contentHtml.includes('href="/team/'),
            false,
            "Should not include author link when no author is set",
          );
        },
      );
    },
  },
  {
    name: "post-meta-with-thumbnail",
    description:
      "News post with author that has image renders grid layout with thumbnail",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-thumbnail-post.md",
              frontmatter: {
                title: "Post With Author Thumbnail",
                author: "src/team/jane-doe.md",
              },
              content: "Post content here.",
            },
            {
              path: "team/jane-doe.md",
              frontmatter: {
                title: "Jane Doe",
                snippet: "Test team member",
                image: "src/images/placeholder-square-1.jpg",
              },
              content: "Jane Doe bio.",
            },
          ],
          images: ["placeholder-square-1.jpg"],
        },
        (site) => {
          const doc = site.getDoc("/news/thumbnail-post/index.html");
          const postMeta = doc.querySelector(".post-meta");

          expectStrictEqual(
            postMeta !== null,
            true,
            "Should have .post-meta element",
          );
          expectStrictEqual(
            postMeta.classList.contains("with-thumbnail"),
            true,
            "Should have with-thumbnail class for author with image",
          );
          expectStrictEqual(
            postMeta.querySelector("figure") !== null,
            true,
            "Should have figure element for thumbnail",
          );
          expectStrictEqual(
            postMeta.querySelector("figure a") !== null,
            true,
            "Should have link inside figure",
          );
          expectStrictEqual(
            postMeta.querySelector("address") !== null,
            true,
            "Should have address element for author",
          );
          expectStrictEqual(
            postMeta.querySelector('a[rel="author"]') !== null,
            true,
            "Should have author link with rel=author",
          );
          expectStrictEqual(
            postMeta.querySelector("time") !== null,
            true,
            "Should have time element",
          );
          expectStrictEqual(
            postMeta.querySelector("time").hasAttribute("datetime"),
            true,
            "Time element should have datetime attribute",
          );
        },
      );
    },
  },
  {
    name: "post-meta-without-thumbnail",
    description:
      "News post with author but no image renders without thumbnail class",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-no-thumb-post.md",
              frontmatter: {
                title: "Post With Author No Thumbnail",
                author: "src/team/john-smith.md",
              },
              content: "Post content here.",
            },
            {
              path: "team/john-smith.md",
              frontmatter: {
                title: "John Smith",
                snippet: "Team member without image",
              },
              content: "John Smith bio.",
            },
          ],
        },
        (site) => {
          const doc = site.getDoc("/news/no-thumb-post/index.html");
          const postMeta = doc.querySelector(".post-meta");

          expectStrictEqual(
            postMeta !== null,
            true,
            "Should have .post-meta element",
          );
          expectStrictEqual(
            postMeta.classList.contains("with-thumbnail"),
            false,
            "Should NOT have with-thumbnail class when author has no image",
          );
          expectStrictEqual(
            postMeta.querySelector("figure"),
            null,
            "Should NOT have figure element when no image",
          );
          expectStrictEqual(
            postMeta.querySelector("address") !== null,
            true,
            "Should have address element for author",
          );
          expectStrictEqual(
            postMeta.querySelector('a[rel="author"]') !== null,
            true,
            "Should have author link with rel=author",
          );
          expectStrictEqual(
            postMeta.querySelector("time") !== null,
            true,
            "Should have time element",
          );
        },
      );
    },
  },
  {
    name: "post-meta-no-author",
    description: "News post without author renders simple date-only layout",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-anonymous-post.md",
              frontmatter: {
                title: "Anonymous Post",
              },
              content: "Post without an author.",
            },
          ],
        },
        (site) => {
          const doc = site.getDoc("/news/anonymous-post/index.html");
          const postMeta = doc.querySelector(".post-meta");

          expectStrictEqual(
            postMeta !== null,
            true,
            "Should have .post-meta element even without author",
          );
          expectStrictEqual(
            postMeta.classList.contains("with-thumbnail"),
            false,
            "Should NOT have with-thumbnail class",
          );
          expectStrictEqual(
            postMeta.querySelector("figure"),
            null,
            "Should NOT have figure element",
          );
          expectStrictEqual(
            postMeta.querySelector("address"),
            null,
            "Should NOT have address element when no author",
          );
          expectStrictEqual(
            postMeta.querySelector("time") !== null,
            true,
            "Should have time element for date",
          );
          expectStrictEqual(
            postMeta.querySelector("time").hasAttribute("datetime"),
            true,
            "Time element should have datetime attribute",
          );
        },
      );
    },
  },
  {
    name: "post-meta-semantic-html",
    description: "Post meta uses semantic HTML with proper roles",
    asyncTest: async () => {
      await withTestSite(
        {
          files: [
            {
              path: "news/2024-01-01-semantic-test.md",
              frontmatter: {
                title: "Semantic HTML Test",
                author: "src/team/jane-doe.md",
              },
              content: "Testing semantic markup.",
            },
            {
              path: "team/jane-doe.md",
              frontmatter: {
                title: "Jane Doe",
                snippet: "Test team member",
                image: "src/images/placeholder-square-1.jpg",
              },
              content: "Jane Doe bio.",
            },
          ],
          images: ["placeholder-square-1.jpg"],
        },
        (site) => {
          const doc = site.getDoc("/news/semantic-test/index.html");
          const postMeta = doc.querySelector(".post-meta");

          expectStrictEqual(
            postMeta.tagName.toLowerCase(),
            "header",
            "Post meta should be a header element",
          );
          expectStrictEqual(
            postMeta.getAttribute("role"),
            "doc-subtitle",
            "Should have role=doc-subtitle for accessibility",
          );
        },
      );
    },
  },
];

export default createTestRunner("news", testCases);
