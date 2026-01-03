import { describe, expect, test } from "bun:test";
import stringsBase from "#data/strings-base.json" with { type: "json" };
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";
import { memoize } from "#utils/memoize.js";

// Build hardcoded URL patterns dynamically from strings-base.json
// Any key ending in _dir defines a collection directory that shouldn't be hardcoded
const buildHardcodedUrlPatterns = memoize(() =>
  Object.entries(stringsBase)
    .filter(([key]) => key.endsWith("_dir"))
    .flatMap(([, dir]) => [
      // Template literal: `${foo}/events/${...}` or `/events/${...}`
      new RegExp(`\`[^\`]*\\/${dir}\\/\\$\\{`),
      // String concatenation: "/events/" + or '/events/' +
      new RegExp(`["']\\/${dir}\\/["']\\s*\\+`),
      // Assignment: = "/events/..." or = `/events/...`
      new RegExp(`=\\s*["'\`]\\/${dir}\\/[^"'\`]+["'\`]`),
    ]),
);

const HARDCODED_URL_PATTERNS = buildHardcodedUrlPatterns();

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
