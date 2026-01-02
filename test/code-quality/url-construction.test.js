import {
  analyzeFiles,
  assertNoViolations,
  matchAny,
  scanLines,
} from "#test/code-scanner.js";
import {
  createTestRunner,
  expectTrue,
  SRC_JS_FILES,
} from "#test/test-utils.js";

// Patterns that indicate hardcoded URL construction instead of using
// Eleventy's permalink system or strings configuration.
//
// Bad patterns:
// - Hardcoding collection paths like `/events/`, `/products/`, etc.
// - Constructing URLs from filenames without checking for custom permalinks
//
// Good patterns:
// - Using strings.event_permalink_dir, strings.product_permalink_dir, etc.
// - Using data.page.fileSlug or item.fileSlug from Eleventy collections
// - Checking for data.permalink before constructing URLs

// Regexes that match hardcoded URL path construction
// These match patterns like: `/events/${slug}/` or `"/events/" + slug`
const HARDCODED_URL_PATTERNS = [
  // Template literal with hardcoded path: `/events/${...}`
  /`\/events\/\$\{/,
  /`\/products\/\$\{/,
  /`\/locations\/\$\{/,
  /`\/properties\/\$\{/,
  /`\/news\/\$\{/,
  /`\/guide\/\$\{/,
  /`\/menus\/\$\{/,
  /`\/categories\/\$\{/,

  // String concatenation with hardcoded path: "/events/" + or '/events/' +
  /["']\/events\/["']\s*\+/,
  /["']\/products\/["']\s*\+/,
  /["']\/locations\/["']\s*\+/,
  /["']\/properties\/["']\s*\+/,
  /["']\/news\/["']\s*\+/,
  /["']\/guide\/["']\s*\+/,
  /["']\/menus\/["']\s*\+/,
  /["']\/categories\/["']\s*\+/,

  // Assignment with hardcoded path: = "/events/..." or = `/events/...`
  /=\s*["'`]\/events\/[^"'`]+["'`]/,
  /=\s*["'`]\/products\/[^"'`]+["'`]/,
  /=\s*["'`]\/locations\/[^"'`]+["'`]/,
  /=\s*["'`]\/properties\/[^"'`]+["'`]/,
];

// Files that are allowed to have these patterns (with justification)
const ALLOWED_FILES = new Set([
  // Test files can have hardcoded URLs for test fixtures
  "test/recurring-events.test.js",
  "test/url-construction.test.js",
  "test/events.test.js",
  "test/navigation.test.js",
  "test/area-list.test.js",
]);

// Patterns that indicate false positives (reading URLs, not constructing them)
const ALLOWED_LINE_PATTERNS = [
  /^\s*\/\//, // Comments
  /^\s*\*/, // Block comment lines
  /\.split\(/, // URL splitting/parsing
  /\.includes\(/, // String matching
  /\.startsWith\(/, // String matching
  /\.match\(/, // Regex matching
];

/**
 * Find hardcoded URL patterns in source code
 */
const findHardcodedUrls = (source) =>
  scanLines(source, (line, lineNum) => {
    const trimmed = line.trim();

    // Skip allowed line patterns (comments, URL parsing)
    if (matchAny(trimmed, ALLOWED_LINE_PATTERNS)) return null;

    // Check for hardcoded URL patterns
    const result = matchAny(line, HARDCODED_URL_PATTERNS);
    return result ? { lineNumber: lineNum, line: trimmed } : null;
  });

/**
 * Analyze all JS files for hardcoded URL patterns
 */
const analyzeHardcodedUrls = () =>
  analyzeFiles(
    SRC_JS_FILES,
    (source, relativePath) =>
      findHardcodedUrls(source).map((hit) => ({
        file: relativePath,
        line: hit.lineNumber,
        code: hit.line,
      })),
    { excludeFiles: [...ALLOWED_FILES] },
  );

const testCases = [
  {
    name: "detect-hardcoded-events-url",
    description: "Detects hardcoded /events/ URL pattern",
    test: () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture
      const source = "const url = `/events/${slug}/`;";
      const results = findHardcodedUrls(source);
      expectTrue(results.length === 1, "Should detect hardcoded /events/ URL");
    },
  },
  {
    name: "detect-hardcoded-products-url",
    description: "Detects hardcoded /products/ URL pattern",
    test: () => {
      const source = 'const url = "/products/" + productSlug;';
      const results = findHardcodedUrls(source);
      expectTrue(
        results.length === 1,
        "Should detect hardcoded /products/ URL",
      );
    },
  },
  {
    name: "allow-comments",
    description: "Allows hardcoded URLs in comments",
    test: () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture
      const source = "// Example: `/events/${slug}/`";
      const results = findHardcodedUrls(source);
      expectTrue(results.length === 0, "Should allow URLs in comments");
    },
  },
  {
    name: "allow-url-parsing",
    description: "Allows URL splitting/parsing operations",
    test: () => {
      const source = 'const parts = url.split("/events/");';
      const results = findHardcodedUrls(source);
      expectTrue(results.length === 0, "Should allow URL parsing");
    },
  },
  {
    name: "allow-strings-config-usage",
    description: "Allows URL construction using strings config",
    test: () => {
      const source = `const url = \`/\${strings.event_permalink_dir}/\${fileSlug}/\`;`;
      const results = findHardcodedUrls(source);
      expectTrue(
        results.length === 0,
        "Should allow strings config URL construction",
      );
    },
  },
  {
    name: "no-hardcoded-urls-in-src",
    description: "No hardcoded collection URLs in src/_lib JavaScript files",
    test: () => {
      const violations = analyzeHardcodedUrls();
      assertNoViolations(expectTrue, violations, {
        message: "hardcoded URL constructions",
        fixHint: "Use strings.*_permalink_dir and/or check for data.permalink",
      });
    },
  },
];

createTestRunner("url-construction", testCases);
