import {
  createTestRunner,
  expectTrue,
  fs,
  path,
  rootDir,
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

// Specific allowed patterns (line content) that are false positives
const ALLOWED_LINES = [
  // Comments explaining the pattern
  /^\s*\/\//,
  /^\s*\*/,
  // URL splitting/parsing (reading URLs, not constructing them)
  /\.split\(/,
  // String matching/includes (checking URLs, not constructing them)
  /\.includes\(/,
  /\.startsWith\(/,
  /\.match\(/,
];

/**
 * Check if a line is allowed despite matching a hardcoded pattern
 */
const isAllowedLine = (line) =>
  ALLOWED_LINES.some((pattern) => pattern.test(line));

/**
 * Find hardcoded URL patterns in source code
 */
const findHardcodedUrls = (source, relativePath) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip allowed line patterns
    if (isAllowedLine(trimmedLine)) continue;

    for (const pattern of HARDCODED_URL_PATTERNS) {
      if (pattern.test(line)) {
        results.push({
          file: relativePath,
          lineNumber: i + 1,
          line: trimmedLine,
          pattern: pattern.toString(),
        });
        break; // Only report once per line
      }
    }
  }

  return results;
};

/**
 * Analyze all JS files for hardcoded URL patterns
 */
const analyzeHardcodedUrls = () => {
  const violations = [];

  for (const relativePath of SRC_JS_FILES) {
    // Skip allowed files
    if (ALLOWED_FILES.has(relativePath)) continue;

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const found = findHardcodedUrls(source, relativePath);
    violations.push(...found);
  }

  return violations;
};

const testCases = [
  {
    name: "detect-hardcoded-events-url",
    description: "Detects hardcoded /events/ URL pattern",
    test: () => {
      const source = "const url = `/events/${slug}/`;";
      const results = findHardcodedUrls(source, "test.js");
      expectTrue(results.length === 1, "Should detect hardcoded /events/ URL");
    },
  },
  {
    name: "detect-hardcoded-products-url",
    description: "Detects hardcoded /products/ URL pattern",
    test: () => {
      const source = 'const url = "/products/" + productSlug;';
      const results = findHardcodedUrls(source, "test.js");
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
      const source = "// Example: `/events/${slug}/`";
      const results = findHardcodedUrls(source, "test.js");
      expectTrue(results.length === 0, "Should allow URLs in comments");
    },
  },
  {
    name: "allow-url-parsing",
    description: "Allows URL splitting/parsing operations",
    test: () => {
      const source = 'const parts = url.split("/events/");';
      const results = findHardcodedUrls(source, "test.js");
      expectTrue(results.length === 0, "Should allow URL parsing");
    },
  },
  {
    name: "allow-strings-config-usage",
    description: "Allows URL construction using strings config",
    test: () => {
      const source =
        "const url = `/${strings.event_permalink_dir}/${fileSlug}/`;";
      const results = findHardcodedUrls(source, "test.js");
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

      if (violations.length > 0) {
        console.log(
          `\n  Found ${violations.length} hardcoded URL constructions:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.lineNumber}`);
          console.log(`       ${v.line}`);
        }
        console.log(
          "\n  To fix: Use strings.*_permalink_dir and/or check for data.permalink\n",
        );
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} hardcoded URL constructions. ` +
          `Use strings.*_permalink_dir instead of hardcoding paths.`,
      );
    },
  },
];

createTestRunner("url-construction", testCases);
