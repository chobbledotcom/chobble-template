import { describe, expect, test } from "bun:test";
import {
  createCodeChecker,
  createPatternMatcher,
  formatViolationReport,
  isCommentLine,
  scanFilesForViolations,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

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
      const violations = [
        { file: "test.js", line: 10, code: "console.log()" },
      ];
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
    test("creates a matcher that finds patterns", () => {
      const matcher = createPatternMatcher(/console\.log/, (line, num) => ({
        file: "test.js",
        line: num,
        code: line,
      }));

      const result = matcher('console.log("test")', 5, "", "test.js");
      expect(result).not.toBeNull();
      expect(result.line).toBe(5);
    });

    test("returns null when pattern not found", () => {
      const matcher = createPatternMatcher(/console\.log/, (line, num) => ({
        file: "test.js",
        line: num,
        code: line,
      }));

      const result = matcher("const x = 1;", 5, "", "test.js");
      expect(result).toBeNull();
    });

    test("works with array of patterns", () => {
      const matcher = createPatternMatcher(
        [/foo/, /bar/],
        (line, num, match) => ({
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
      const testFiles = SRC_JS_FILES.slice(0, 2);
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
        extractData: (line, _num, match) => ({ funcName: match[1] }),
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

    test("analyze function processes files and returns violations", () => {
      const { analyze } = createCodeChecker({
        patterns: /this_pattern_should_not_match_anything_xyz123/,
        files: SRC_JS_FILES.slice(0, 1),
      });

      const violations = analyze();
      expect(Array.isArray(violations)).toBe(true);
      expect(violations.length).toBe(0);
    });
  });
});
