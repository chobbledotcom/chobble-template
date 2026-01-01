import siteData from "#data/site.json" with { type: "json" };
import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";
import { canonicalUrl } from "#utils/canonical-url.js";

// Import actual site URL from production config - tests stay in sync with reality
const siteUrl = siteData.url;

const testCases = [
  {
    name: "canonicalUrl-joins-site-url-with-page-path",
    description: "Correctly joins site URL with a page path",
    test: () => {
      const result = canonicalUrl("/quote/");

      expectStrictEqual(
        result,
        `${siteUrl}/quote/`,
        "Should join site URL with page path",
      );
    },
  },
  {
    name: "canonicalUrl-adds-leading-slash-when-missing",
    description: "Adds leading slash when page URL is missing one",
    test: () => {
      const result = canonicalUrl("quote/");

      expectStrictEqual(
        result,
        `${siteUrl}/quote/`,
        "Should add leading slash to page path",
      );
    },
  },
  {
    name: "canonicalUrl-normalizes-multiple-slashes",
    description: "Normalizes multiple leading slashes to single slash",
    test: () => {
      const result = canonicalUrl("///quote/");

      expectStrictEqual(
        result,
        `${siteUrl}/quote/`,
        "Should normalize multiple leading slashes",
      );
    },
  },
  {
    name: "canonicalUrl-root-returns-site-url",
    description: "Returns site URL without trailing slash for root path",
    test: () => {
      const result = canonicalUrl("/");

      expectStrictEqual(result, siteUrl, "Root path should return site URL");
    },
  },
  {
    name: "canonicalUrl-empty-string-returns-site-url",
    description: "Returns site URL for empty string input",
    test: () => {
      const result = canonicalUrl("");

      expectStrictEqual(result, siteUrl, "Empty string should return site URL");
    },
  },
  {
    name: "canonicalUrl-null-returns-site-url",
    description: "Handles null input gracefully by returning site URL",
    test: () => {
      const result = canonicalUrl(null);

      expectStrictEqual(result, siteUrl, "Null input should return site URL");
    },
  },
  {
    name: "canonicalUrl-undefined-returns-site-url",
    description: "Handles undefined input gracefully by returning site URL",
    test: () => {
      const result = canonicalUrl(undefined);

      expectStrictEqual(
        result,
        siteUrl,
        "Undefined input should return site URL",
      );
    },
  },
];

export default createTestRunner("canonical-url", testCases);
