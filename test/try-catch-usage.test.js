import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES, TEST_FILES } from "./test-utils.js";

// Whitelist of allowed try/catch occurrences
// Format: "filepath:lineNumber" - these are grandfathered in and should be removed over time
const ALLOWED_TRY_CATCHES = new Set([
  // ecommerce-backend/server.js - PayPal API calls
  "ecommerce-backend/server.js:185",
  "ecommerce-backend/server.js:213",
  "ecommerce-backend/server.js:290",

  // test/run-all-tests.js - test runner error handling
  "test/run-all-tests.js:15",
  "test/run-all-tests.js:29",

  // ecommerce-backend/server.test.js - test assertions
  "ecommerce-backend/server.test.js:370",

  // test/render-snippet.test.js - test cleanup
  "test/render-snippet.test.js:102",
  "test/render-snippet.test.js:130",

  // src/assets/js/cart.js - localStorage and fetch handling
  "src/assets/js/cart.js:132",
  "src/assets/js/cart.js:181",
  "src/assets/js/cart.js:496",

  // src/_lib/media/image.js - image processing
  "src/_lib/media/image.js:74",
  "src/_lib/media/image.js:331",

  // src/assets/js/stripe-checkout.js - Stripe API
  "src/assets/js/stripe-checkout.js:38",

  // test/test-utils.js - test utilities with cleanup
  "test/test-utils.js:145",
  "test/test-utils.js:162",
  "test/test-utils.js:170",
  "test/test-utils.js:176",

  // test/scss.test.js - SCSS compilation tests
  "test/scss.test.js:42",
  "test/scss.test.js:208",

  // test/navigation.test.js - navigation tests
  "test/navigation.test.js:80",

  // src/assets/js/cart-utils.js - JSON parsing
  "src/assets/js/cart-utils.js:12",

  // test/checkout.test.js - checkout flow tests
  "test/checkout.test.js:235",
  "test/checkout.test.js:283",
  "test/checkout.test.js:344",
  "test/checkout.test.js:372",
  "test/checkout.test.js:406",
  "test/checkout.test.js:456",
  "test/checkout.test.js:487",
  "test/checkout.test.js:522",
  "test/checkout.test.js:543",
  "test/checkout.test.js:572",
  "test/checkout.test.js:612",
  "test/checkout.test.js:650",
  "test/checkout.test.js:689",

  // test/inline-asset.test.js - inline asset tests
  "test/inline-asset.test.js:128",
  "test/inline-asset.test.js:151",
  "test/inline-asset.test.js:171",
  "test/inline-asset.test.js:235",
  "test/inline-asset.test.js:281",
  "test/inline-asset.test.js:312",
  "test/inline-asset.test.js:337",
  "test/inline-asset.test.js:360",

  // test/file-utils.test.js - file utility tests
  "test/file-utils.test.js:85",
  "test/file-utils.test.js:222",
  "test/file-utils.test.js:265",

  // src/_lib/eleventy/pdf.js - PDF generation
  "src/_lib/eleventy/pdf.js:268",

  // src/_lib/eleventy/recurring-events.js - date parsing
  "src/_lib/eleventy/recurring-events.js:49",

  // src/_lib/utils/canonical-url.js - URL parsing
  "src/_lib/utils/canonical-url.js:17",

  // src/_lib/filters/spec-filters.js - spec filtering
  "src/_lib/filters/spec-filters.js:15",
]);

/**
 * Find all try { occurrences in a file
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match 'try' followed by optional whitespace and '{'
    const regex = /\btry\s*\{/g;

    if (regex.test(line)) {
      // Skip if in a comment
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("*")) continue; // Block comment line

      results.push({
        lineNumber: i + 1,
        line: trimmed,
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files and find try/catch usage
 */
const analyzeTryCatchUsage = () => {
  const violations = [];
  const allowed = [];

  // Exclude this test file since it contains try/catch examples in test strings
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES]
    .filter((f) => f !== "test/try-catch-usage.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const tryCatches = findTryCatches(source);

    for (const tc of tryCatches) {
      const location = `${relativePath}:${tc.lineNumber}`;

      if (ALLOWED_TRY_CATCHES.has(location)) {
        allowed.push({
          file: relativePath,
          line: tc.lineNumber,
          code: tc.line,
        });
      } else {
        violations.push({
          file: relativePath,
          line: tc.lineNumber,
          code: tc.line,
        });
      }
    }
  }

  return { violations, allowed };
};

const testCases = [
  {
    name: "find-try-catch-in-source",
    description: "Correctly identifies try/catch blocks in source code",
    test: () => {
      const source = `
const a = 1;
try {
  doSomething();
} catch (e) {
  handleError(e);
}
// try { this is a comment
const b = 2;
      `;
      const results = findTryCatches(source);
      expectTrue(
        results.length === 1,
        `Expected 1 try/catch, found ${results.length}`
      );
      expectTrue(
        results[0].lineNumber === 3,
        `Expected line 3, got ${results[0].lineNumber}`
      );
    },
  },
  {
    name: "no-new-try-catches",
    description: "No new try/catch blocks outside the whitelist",
    test: () => {
      const { violations, allowed } = analyzeTryCatchUsage();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} non-whitelisted try/catch blocks:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: refactor to avoid try/catch, or add to ALLOWED_TRY_CATCHES in try-catch-usage.test.js\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted try/catch blocks. See list above.`
      );
    },
  },
  {
    name: "report-allowed-try-catches",
    description: "Reports whitelisted try/catch blocks for tracking",
    test: () => {
      const { allowed } = analyzeTryCatchUsage();

      console.log(`\n  Whitelisted try/catch blocks: ${allowed.length}`);
      console.log("  These should be removed over time:\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of allowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(a.line);
      }

      for (const [file, lines] of Object.entries(byFile)) {
        console.log(`     ${file}: lines ${lines.join(", ")}`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported whitelisted try/catch blocks");
    },
  },
];

createTestRunner("try-catch-usage", testCases);
