import { describe, expect, test } from "vitest";
import stringsBase from "#data/strings-base.json" with { type: "json" };
import {
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
} from "#test/code-scanner.js";
import { SCRIPT_JS_FILES, SRC_JS_FILES } from "#test/test-utils.js";
import { memoize } from "#utils/fp/memoize.js";

// Build hardcoded URL patterns dynamically from strings-base.json
// Any key ending in _dir defines a collection directory that shouldn't be hardcoded
const buildHardcodedUrlPatterns = memoize(() =>
  Object.entries(stringsBase)
    .filter(([key]) => key.endsWith("_dir"))
    .flatMap(([, dir]) => [
      // Template literal: `${foo}/news/${...}` or `/news/${...}`
      new RegExp(`\`[^\`]*\\/${dir}\\/\\$\\{`),
      // String concatenation: "/news/" + or '/news/' +
      new RegExp(`["']\\/${dir}\\/["']\\s*\\+`),
      // Assignment: = "/news/..." or = `/news/...`
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
    files: combineFileLists([SRC_JS_FILES(), SCRIPT_JS_FILES()]),
    excludeFiles: ALLOWED_FILES,
  });

describe("url-construction", () => {
  test("Detects hardcoded /news/ URL pattern", () => {
    const source = "const url = `/news/${slug}/`;";
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(1);
  });

  test("Detects hardcoded /guide/ URL pattern", () => {
    const source = 'const url = "/guide/" + productSlug;';
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(1);
  });

  test("Allows hardcoded URLs in comments", () => {
    const source = "// Example: `/news/${slug}/`";
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("Allows URL splitting/parsing operations", () => {
    const source = 'const parts = url.split("/news/");';
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("Allows URL construction using strings config", () => {
    const source =
      "const url = `/${strings.event_permalink_dir}/${fileSlug}/`;";
    const results = findHardcodedUrls(source);
    expect(results.length).toBe(0);
  });

  test("No hardcoded collection URLs in src/_lib JavaScript files", () => {
    const { violations } = analyzeHardcodedUrls();
    assertNoViolations(violations, {
      message: "hardcoded URL constructions",
      fixHint: "Use strings.*_permalink_dir and/or check for data.permalink",
    });
  });
});
