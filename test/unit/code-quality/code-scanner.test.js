import { describe, expect, test } from "bun:test";
import {
  createCodeChecker,
  createPatternMatcher,
  expectNoStaleExceptions,
  formatViolationReport,
  isCommentLine,
  scanFilesForViolations,
  validateExceptions,
} from "#test/code-scanner.js";
import { captureConsole, SRC_JS_FILES } from "#test/test-utils.js";

describe("code-scanner", () => {
  describe("isCommentLine", () => {
    test("detects single-line comments", () => {
      expect(isCommentLine("// this is a comment")).toBe(true);
      expect(isCommentLine("  // indented comment")).toBe(true);
    });

    test("detects block comment patterns", () => {
      expect(isCommentLine("/* block start")).toBe(true);
      expect(isCommentLine(" * continuation")).toBe(true);
      expect(isCommentLine("*/")).toBe(true);
      expect(isCommentLine("/* inline */")).toBe(true);
    });

    test("returns false for non-comments", () => {
      expect(isCommentLine("const x = 1;")).toBe(false);
      expect(isCommentLine("")).toBe(false);
    });
  });

  describe("formatViolationReport", () => {
    test("returns empty report for no violations", () => {
      const result = formatViolationReport([]);
      expect(result.count).toBe(0);
      expect(result.report).toBe("");
    });

    test("formats violations with code", () => {
      const violations = [{ file: "test.js", line: 10, code: "console.log()" }];
      const result = formatViolationReport(violations, { message: "issues" });
      expect(result.count).toBe(1);
      expect(result.report).toContain("Found 1 issues");
      expect(result.report).toContain("test.js:10");
      expect(result.report).toContain("console.log()");
    });

    test("formats violations without code", () => {
      const violations = [{ file: "test.js", line: 10 }];
      const result = formatViolationReport(violations);
      expect(result.count).toBe(1);
      expect(result.report).toContain("test.js:10");
    });

    test("shows overflow message when exceeding limit", () => {
      const violations = Array.from({ length: 15 }, (_, i) => ({
        file: `test${i}.js`,
        line: i,
      }));
      const result = formatViolationReport(violations, { limit: 10 });
      expect(result.count).toBe(15);
      expect(result.report).toContain("... and 5 more");
    });

    test("includes fix hint when provided", () => {
      const violations = [{ file: "test.js", line: 1 }];
      const result = formatViolationReport(violations, {
        fixHint: "Remove the issue",
      });
      expect(result.report).toContain("To fix: Remove the issue");
    });
  });

  describe("createPatternMatcher", () => {
    const testMatcherResult = (matcher, input, expectedResult) => {
      const result = matcher(input, 5, "", "test.js");
      if (expectedResult === null) {
        expect(result).toBeNull();
      } else if (typeof expectedResult === "object") {
        expect(result).not.toBeNull();
        for (const [key, value] of Object.entries(expectedResult)) {
          expect(result[key]).toBe(value);
        }
      }
    };

    const consoleLogMatcher = createPatternMatcher(
      /console\.log/,
      (line, num) => ({
        file: "test.js",
        line: num,
        code: line,
      }),
    );

    test("creates a matcher that finds patterns", () => {
      testMatcherResult(consoleLogMatcher, 'console.log("test")', { line: 5 });
    });

    test("returns null when pattern not found", () => {
      testMatcherResult(consoleLogMatcher, "const x = 1;", null);
    });

    test("works with array of patterns", () => {
      const matcher = createPatternMatcher(
        [/foo/, /bar/],
        (_line, num, match) => ({
          line: num,
          match: match[0],
        }),
      );

      expect(matcher("foo()", 1, "", "test.js").match).toBe("foo");
      expect(matcher("bar()", 2, "", "test.js").match).toBe("bar");
    });
  });

  describe("scanFilesForViolations", () => {
    test("scans files and collects violations", () => {
      // Use a small subset of files for testing
      const testFiles = SRC_JS_FILES().slice(0, 2);
      const violations = scanFilesForViolations(
        testFiles,
        (line, lineNum, _source, relativePath) => {
          // Just check for any 'const' declarations as a simple test
          if (line.includes("export const")) {
            return { file: relativePath, line: lineNum, code: line.trim() };
          }
          return null;
        },
      );

      // Should find at least some exports in source files
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("createCodeChecker", () => {
    test("creates find and analyze functions", () => {
      const { find, analyze } = createCodeChecker({
        patterns: /test_pattern_xyz/,
        files: [],
      });

      expect(typeof find).toBe("function");
      expect(typeof analyze).toBe("function");
    });

    test("find function returns matches", () => {
      const { find } = createCodeChecker({
        patterns: /hello/,
        skipPatterns: [],
        files: [],
      });

      const results = find("hello world\ngoodbye");
      expect(results.length).toBe(1);
      expect(results[0].lineNumber).toBe(1);
      expect(results[0].line).toBe("hello world");
    });

    test("find function skips lines matching skipPatterns", () => {
      const { find } = createCodeChecker({
        patterns: /hello/,
        skipPatterns: [/^\/\//],
        files: [],
      });

      const results = find("// hello comment\nhello code");
      expect(results.length).toBe(1);
      expect(results[0].line).toBe("hello code");
    });

    test("extractData adds custom fields", () => {
      const { find } = createCodeChecker({
        patterns: /(\w+)\(\)/,
        skipPatterns: [],
        extractData: (_line, _num, match) => ({ funcName: match[1] }),
        files: [],
      });

      const results = find("foo()");
      expect(results[0].funcName).toBe("foo");
    });

    test("extractData returning null filters out the match", () => {
      const { find } = createCodeChecker({
        patterns: /hello/,
        skipPatterns: [],
        extractData: () => null,
        files: [],
      });

      const results = find("hello world");
      expect(results.length).toBe(0);
    });

    test("analyze function processes files and returns violations/allowed", () => {
      const { analyze } = createCodeChecker({
        patterns: /this_pattern_should_not_match_anything_xyz123/,
        files: SRC_JS_FILES().slice(0, 1),
      });

      const { violations, allowed } = analyze();
      expect(Array.isArray(violations)).toBe(true);
      expect(Array.isArray(allowed)).toBe(true);
      expect(violations.length).toBe(0);
    });
  });

  describe("validateExceptions", () => {
    // Helper to validate single stale exception
    const testStaleException = (
      allowlist,
      patterns,
      expectedEntry,
      expectedReasonPattern,
    ) => {
      const stale = validateExceptions(allowlist, patterns);
      expect(stale.length).toBe(1);
      expect(stale[0].entry).toBe(expectedEntry);
      expect(stale[0].reason).toMatch(expectedReasonPattern);
    };

    test("returns empty array when all exceptions are valid", () => {
      const allowlist = new Set([
        "test/code-scanner.js:5", // import statement
        "test/code-scanner.js:6", // import statement
      ]);
      const patterns = /import/;

      const stale = validateExceptions(allowlist, patterns);
      expect(stale).toEqual([]);
    });

    test("skips file-only entries without line numbers", () => {
      const allowlist = new Set([
        "test/code-scanner.js", // file-only entry, should be skipped
        "test/code-scanner.js:5", // should be validated
      ]);
      const patterns = /import/;

      const stale = validateExceptions(allowlist, patterns);
      expect(stale).toEqual([]);
    });

    test("detects when line number exceeds file length", () => {
      testStaleException(
        new Set(["test/code-scanner.js:999999"]),
        /./,
        "test/code-scanner.js:999999",
        /Line 999999 doesn't exist/,
      );
    });

    test("detects when line number is less than 1", () => {
      testStaleException(
        new Set(["test/code-scanner.js:0"]),
        /./,
        "test/code-scanner.js:0",
        /Line 0 doesn't exist/,
      );
    });

    test("detects when line no longer matches pattern", () => {
      const allowlist = new Set(["test/code-scanner.js:1"]); // Line 1 has a comment, not console.log
      const patterns = /console\.log/;

      const stale = validateExceptions(allowlist, patterns);
      expect(stale.length).toBe(1);
      expect(stale[0].entry).toBe("test/code-scanner.js:1");
      expect(stale[0].reason).toMatch(/Line no longer matches pattern/);
    });

    test("works with multiple patterns", () => {
      const allowlist = new Set(["test/code-scanner.js:5"]);
      const patterns = [/console\.log/, /import/]; // Line 5 should match import

      const stale = validateExceptions(allowlist, patterns);
      expect(stale).toEqual([]);
    });

    test("detects when file does not exist", () => {
      testStaleException(
        new Set(["non-existent-file.js:10"]),
        /./,
        "non-existent-file.js:10",
        /File not found: non-existent-file\.js/,
      );
    });

    test("detects multiple stale entries", () => {
      const allowlist = new Set([
        "test/code-scanner.js:999999", // line doesn't exist
        "non-existent-file.js:10", // file doesn't exist
        "test/code-scanner.js:1", // line doesn't match pattern
      ]);
      const patterns = /console\.log/; // Line 1 won't match this

      const stale = validateExceptions(allowlist, patterns);
      expect(stale.length).toBe(3);
    });
  });

  describe("expectNoStaleExceptions", () => {
    test("logs stale entries when exceptions are invalid", () => {
      const allowlist = new Set([
        "nonexistent-file.js:1", // file doesn't exist
      ]);
      const patterns = /test/;

      const logs = captureConsole(() => {
        // Call the function but catch the assertion error via expect().toThrow()
        expect(() =>
          expectNoStaleExceptions(allowlist, patterns, "TEST_ALLOWLIST"),
        ).toThrow();
      });

      expect(
        logs.some((log) => log.includes("Stale TEST_ALLOWLIST entries")),
      ).toBe(true);
      expect(logs.some((log) => log.includes("nonexistent-file.js:1"))).toBe(
        true,
      );
    });
  });
});
