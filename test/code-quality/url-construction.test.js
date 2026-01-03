import { describe, expect, test } from "bun:test";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Regexes that match hardcoded URL path construction
// These match patterns like: `/events/${slug}/` or `"/events/" + slug`
const HARDCODED_URL_PATTERNS = [
  // Template literal with hardcoded path: `/events/${...}` or `${foo}/events/${...}`
  /`[^`]*\/events\/\$\{/,
  /`[^`]*\/products\/\$\{/,
  /`[^`]*\/locations\/\$\{/,
  /`[^`]*\/properties\/\$\{/,
  /`[^`]*\/news\/\$\{/,
  /`[^`]*\/guide\/\$\{/,
  /`[^`]*\/menus\/\$\{/,
  /`[^`]*\/categories\/\$\{/,

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
const ALLOWED_FILES = [
  // Test files can have hardcoded URLs for test fixtures
  "test/recurring-events.test.js",
  "test/url-construction.test.js",
  "test/events.test.js",
  "test/navigation.test.js",
  "test/area-list.test.js",
];

// Patterns that indicate false positives (reading URLs, not constructing them)
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//, // Comments
  /^\s*\*/, // Block comment lines
  /\.split\(/, // URL splitting/parsing
  /\.includes\(/, // String matching
  /\.startsWith\(/, // String matching
  /\.match\(/, // Regex matching
];

// Create checker for hardcoded URL patterns using the factory
const { find: findHardcodedUrls, analyze: analyzeHardcodedUrls } =
  createCodeChecker({
    patterns: HARDCODED_URL_PATTERNS,
    skipPatterns: SKIP_LINE_PATTERNS,
    files: SRC_JS_FILES(),
    excludeFiles: ALLOWED_FILES,
  });

describe("url-construction", () => {
  test("Detects hardcoded /events/ URL pattern", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture
    const source = "const url = `/events/${slug}/`;";
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(1);
  });

  test("Detects hardcoded /products/ URL pattern", () => {
    const source = 'const url = "/products/" + productSlug;';
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(1);
  });

  test("Allows hardcoded URLs in comments", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture
    const source = "// Example: `/events/${slug}/`";
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("Allows URL splitting/parsing operations", () => {
    const source = 'const parts = url.split("/events/");';
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("Allows URL construction using strings config", () => {
    const source = `const url = \`/\${strings.event_permalink_dir}/\${fileSlug}/\`;`;
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("No hardcoded collection URLs in src/_lib JavaScript files", () => {
    const violations = analyzeHardcodedUrls();
    assertNoViolations(violations, {
      message: "hardcoded URL constructions",
      fixHint: "Use strings.*_permalink_dir and/or check for data.permalink",
    });
  });
});
