import { describe, expect, test } from "bun:test";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { TEST_FILES } from "#test/test-utils.js";

// Patterns that indicate incorrect DOM mocking approaches
// happy-dom's GlobalRegistrator provides global document, so these are unnecessary
const BAD_DOM_PATTERNS = [
  /globalThis\.document/, // globalThis.document - use document directly
  /new\s+DOM\s*\(/, // new DOM() - use document.body.innerHTML instead
];

// Files that are allowed to use these patterns (infrastructure only)
const ALLOWLIST = new Set([
  "test/test-utils.js:10", // DOM class definition
  "test/test-site-factory.js:330", // DOM used for parsing build output
  "test/code-quality/template-selectors.test.js:55", // DOM for HTML parsing
  "test/eleventy/recurring-events.test.js:49", // DOM for parseDoc helper
  "test/code-quality/dom-mocking.test.js", // This file (tests these patterns)
]);

const { find: findBadDomPatterns, analyze: domPatternAnalysis } =
  createCodeChecker({
    patterns: BAD_DOM_PATTERNS,
    extractData: (line) => {
      if (/globalThis\.document/.test(line)) {
        return { reason: "Use document directly (happy-dom provides global)" };
      }
      if (/new\s+DOM\s*\(/.test(line)) {
        return { reason: "Use document.body.innerHTML instead of new DOM()" };
      }
      return null;
    },
    files: TEST_FILES,
    allowlist: ALLOWLIST,
  });

describe("dom-mocking", () => {
  test("Detects globalThis.document usage", () => {
    const source = `
const originalDoc = globalThis.document;
globalThis.document = mockDoc;
document.body.innerHTML = "<div></div>";
    `;
    const results = findBadDomPatterns(source);
    expect(results.length).toBe(2);
    expect(results[0].reason).toBe(
      "Use document directly (happy-dom provides global)",
    );
  });

  test("Detects new DOM() usage", () => {
    const source = `
const dom = new DOM("<html></html>");
const dom2 = new DOM(\`<div></div>\`);
document.body.innerHTML = "<div></div>";
    `;
    const results = findBadDomPatterns(source);
    expect(results.length).toBe(2);
    expect(results[0].reason).toBe(
      "Use document.body.innerHTML instead of new DOM()",
    );
  });

  test("Allows direct document usage", () => {
    const source = `
document.body.innerHTML = "<div></div>";
const el = document.querySelector(".test");
document.createElement("div");
    `;
    const results = findBadDomPatterns(source);
    expect(results.length).toBe(0);
  });

  test("No bad DOM patterns in test files", () => {
    const { violations } = domPatternAnalysis();
    assertNoViolations(violations, {
      message: "bad DOM mocking pattern(s)",
      fixHint:
        "Use document directly (happy-dom provides globals via test/setup.js). " +
        "Set DOM with document.body.innerHTML = '...' instead of new DOM()",
    });
  });

  test("Reports allowlisted DOM patterns for tracking", () => {
    const { allowed } = domPatternAnalysis();
    if (allowed.length > 0) {
      console.log(`\n  Allowlisted DOM patterns: ${allowed.length}`);
      console.log("  These are infrastructure files that legitimately use DOM:");
      for (const loc of allowed) {
        console.log(`    - ${loc.location}`);
      }
    }
    expect(true).toBe(true);
  });
});
