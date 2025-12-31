import { normaliseSlug } from "#utils/slug-utils.js";
import { createTestRunner, expectStrictEqual, fs, path } from "./test-utils.js";

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
    test: () => {
      const newsHtmlPath = path.join(
        process.cwd(),
        "_site/news/first/index.html",
      );
      const html = fs.readFileSync(newsHtmlPath, "utf-8");

      // Extract just the #content section to avoid matching nav/sidebar links
      const contentMatch = html.match(
        /<article[^>]*id="content"[^>]*>([\s\S]*?)<\/article>/,
      );
      const contentHtml = contentMatch ? contentMatch[1] : "";

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
  },
  {
    name: "news-without-author-no-link",
    description: "News post without author does not render author section",
    test: () => {
      const newsHtmlPath = path.join(
        process.cwd(),
        "_site/news/second/index.html",
      );
      const html = fs.readFileSync(newsHtmlPath, "utf-8");

      // Extract just the #content section to avoid matching nav/sidebar links
      const contentMatch = html.match(
        /<article[^>]*id="content"[^>]*>([\s\S]*?)<\/article>/,
      );
      const contentHtml = contentMatch ? contentMatch[1] : "";

      expectStrictEqual(
        contentHtml.includes('href="/team/'),
        false,
        "Should not include author link when no author is set",
      );
    },
  },
];

export default createTestRunner("news", testCases);
