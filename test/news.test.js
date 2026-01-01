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
];

export default createTestRunner("news", testCases);
