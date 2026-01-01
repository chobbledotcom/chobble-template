import siteData from "#data/site.json" with { type: "json" };
import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";
import { canonicalUrl } from "#utils/canonical-url.js";

// Constant: validated at module load, never changes during test execution
const SITE_URL = siteData.url;

// Helper to verify result is always a string (invariant check)
const expectStringResult = (result, context) => {
  expectStrictEqual(typeof result, "string", `${context}: must return string`);
};

const testCases = [
  // ===========================================
  // Basic Path Joining
  // ===========================================
  {
    name: "basic-path-with-leading-slash",
    description:
      "Core use case: page paths from Eleventy always have leading slash",
    test: () => {
      const result = canonicalUrl("/quote/");

      expectStringResult(result, "/quote/");
      expectStrictEqual(result, `${SITE_URL}/quote/`, `got: ${result}`);
    },
  },
  {
    name: "path-without-leading-slash",
    description: "Defensive: handle user content or malformed paths gracefully",
    test: () => {
      const result = canonicalUrl("quote/");

      expectStringResult(result, "quote/");
      expectStrictEqual(result, `${SITE_URL}/quote/`, `got: ${result}`);
    },
  },
  {
    name: "multiple-leading-slashes",
    description: "Defensive: malformed paths shouldn't create broken URLs",
    test: () => {
      const result = canonicalUrl("///quote/");

      expectStringResult(result, "///quote/");
      expectStrictEqual(result, `${SITE_URL}/quote/`, `got: ${result}`);
    },
  },

  // ===========================================
  // Complex Paths (Real-world Scenarios)
  // ===========================================
  {
    name: "deeply-nested-path",
    description: "Products/categories can be nested several levels deep",
    test: () => {
      const result = canonicalUrl("/products/electronics/phones/iphone-15/");

      expectStringResult(result, "nested path");
      expectStrictEqual(
        result,
        `${SITE_URL}/products/electronics/phones/iphone-15/`,
        `got: ${result}`,
      );
    },
  },
  {
    name: "path-with-query-string",
    description: "Search pages and filtered views include query parameters",
    test: () => {
      const result = canonicalUrl("/search?q=test&category=all");

      expectStringResult(result, "query string path");
      expectStrictEqual(
        result,
        `${SITE_URL}/search?q=test&category=all`,
        `got: ${result}`,
      );
    },
  },
  {
    name: "path-with-fragment",
    description: "Deep links to page sections are valid canonical URLs",
    test: () => {
      const result = canonicalUrl("/about/#team");

      expectStringResult(result, "fragment path");
      expectStrictEqual(result, `${SITE_URL}/about/#team`, `got: ${result}`);
    },
  },
  {
    name: "path-with-query-and-fragment",
    description: "Combination of query params and fragment identifiers",
    test: () => {
      const result = canonicalUrl("/products?sort=price#filters");

      expectStringResult(result, "query+fragment path");
      expectStrictEqual(
        result,
        `${SITE_URL}/products?sort=price#filters`,
        `got: ${result}`,
      );
    },
  },

  // ===========================================
  // Special Characters
  // ===========================================
  {
    name: "path-with-encoded-spaces",
    description: "URL-encoded characters must be preserved for valid URLs",
    test: () => {
      const result = canonicalUrl("/products/my%20product/");

      expectStringResult(result, "encoded space");
      expectStrictEqual(
        result,
        `${SITE_URL}/products/my%20product/`,
        `got: ${result}`,
      );
    },
  },
  {
    name: "path-with-unicode",
    description: "International content uses unicode in URLs",
    test: () => {
      const result = canonicalUrl("/日本語/ページ/");

      expectStringResult(result, "unicode path");
      expectStrictEqual(result, `${SITE_URL}/日本語/ページ/`, `got: ${result}`);
    },
  },
  {
    name: "path-with-special-url-chars",
    description: "Ampersands, equals signs in paths (not just query strings)",
    test: () => {
      const result = canonicalUrl("/compare/a=1&b=2/");

      expectStringResult(result, "special chars");
      expectStrictEqual(
        result,
        `${SITE_URL}/compare/a=1&b=2/`,
        `got: ${result}`,
      );
    },
  },

  // ===========================================
  // Boundary Cases
  // ===========================================
  {
    name: "very-long-path",
    description:
      "Deep hierarchies or long slugs shouldn't break URL construction",
    test: () => {
      const longSegment = "a".repeat(200);
      const result = canonicalUrl(`/category/${longSegment}/product/`);

      expectStringResult(result, "long path");
      expectStrictEqual(
        result,
        `${SITE_URL}/category/${longSegment}/product/`,
        `got length: ${result.length}`,
      );
    },
  },
  {
    name: "protocol-relative-input",
    description: "Malformed input like //example.com should be treated as path",
    test: () => {
      // The function strips leading slashes and prepends one, so this becomes /example.com
      const result = canonicalUrl("//example.com/path");

      expectStringResult(result, "protocol-relative");
      expectStrictEqual(
        result,
        `${SITE_URL}/example.com/path`,
        `got: ${result}`,
      );
    },
  },
  {
    name: "path-with-only-slashes",
    description: "Edge case: multiple slashes but no content",
    test: () => {
      const result = canonicalUrl("////");

      expectStringResult(result, "only slashes");
      // After stripping leading slashes: "", prepend /: "/", so it's just site URL + /
      expectStrictEqual(result, `${SITE_URL}/`, `got: ${result}`);
    },
  },

  // ===========================================
  // Root/Empty/Null Handling
  // ===========================================
  {
    name: "root-path",
    description: "Homepage canonical URL should be the bare site URL",
    test: () => {
      const result = canonicalUrl("/");

      expectStringResult(result, "root path");
      expectStrictEqual(result, SITE_URL, `got: ${result}`);
    },
  },
  {
    name: "empty-string",
    description: "Missing page URL in templates should fall back to site URL",
    test: () => {
      const result = canonicalUrl("");

      expectStringResult(result, "empty string");
      expectStrictEqual(result, SITE_URL, `got: ${result}`);
    },
  },
  {
    name: "null-input",
    description: "Template variable might be null if not set",
    test: () => {
      const result = canonicalUrl(null);

      expectStringResult(result, "null");
      expectStrictEqual(result, SITE_URL, `got: ${result}`);
    },
  },
  {
    name: "undefined-input",
    description: "Template variable might be undefined if not passed",
    test: () => {
      const result = canonicalUrl(undefined);

      expectStringResult(result, "undefined");
      expectStrictEqual(result, SITE_URL, `got: ${result}`);
    },
  },
];

export default createTestRunner("canonical-url", testCases);
