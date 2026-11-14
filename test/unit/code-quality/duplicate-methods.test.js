/**
 * Detects functions/methods with the same name across different files.
 *
 * Duplicate function names across files indicate potential opportunities
 * to unify code into shared utilities. This scanner identifies all cases
 * where the same function name appears in multiple files.
 */
import { describe, expect, test } from "vitest";
import { assertNoViolations, readSource } from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";
import { frozenSet } from "#utils/fp/set.js";

const THIS_FILE = "test/unit/code-quality/duplicate-methods.test.js";

// ============================================
// Allowlist Configuration
// ============================================

// Function names that are intentionally allowed to be duplicated
// "init" is a common initialization pattern used across modules
// "createElement" - generic DOM helper name used in different contexts
// "getJsConfigFilter" - test helper for getting the filter via config registration
const ALLOWED_DUPLICATE_NAMES = frozenSet([
  "init",
  "main", // conventional entry-point name in every CLI script
  "createElement",
  "getJsConfigFilter",
  "transformHtml", // test helper with same name but different implementations
  // Generic parser/recursion helper names that recur across unrelated
  // scanners (source-analysis, yaml compaction, directory walking)
  "processChar",
  "processLine",
  "walk",
  // Template fixture function names used in code-quality test cases
  "outer",
  "innerNested",
  "useIt",
]);

// Directories to exclude from analysis
const EXCLUDED_DIRS = frozenSet([]);

// ============================================
// Function Definition Patterns
// ============================================

// Matches: function name(...) or async function name(...)
const FUNCTION_DECL_PATTERN =
  /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/;

// Matches: const/let/var name = (...) => or const/let/var name = async (...) =>
// Also matches: const/let/var name = function(...)
// Note: Requires => for arrow functions to avoid matching simple assignments like const x = (expr)
const ARROW_OR_EXPR_PATTERN =
  /^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^)]*\)\s*=>|[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>)/;

// ============================================
// Analysis Functions
// ============================================

/**
 * Extract function names from source code.
 * Returns array of { name, line }
 */
const extractFunctionNames = (source) =>
  source.split("\n").flatMap((line, index) => {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return [];

    const funcMatch =
      line.match(FUNCTION_DECL_PATTERN) || line.match(ARROW_OR_EXPR_PATTERN);

    return funcMatch ? [{ name: funcMatch[1], line: index + 1 }] : [];
  });

/**
 * Find all duplicate function names (appearing in 2+ different files).
 */
const findDuplicateMethods = (
  files = ALL_JS_FILES(),
  loadSource = readSource,
) => {
  // Build location map: function name -> [{ file, line, name }]
  const locationMap = Map.groupBy(
    files
      .filter(
        (file) =>
          file !== THIS_FILE &&
          ![...EXCLUDED_DIRS].some((dir) => file.startsWith(`${dir}/`)),
      )
      .flatMap((file) =>
        extractFunctionNames(loadSource(file)).map((func) => ({
          name: func.name,
          file,
          line: func.line,
        })),
      ),
    (loc) => loc.name,
  );

  const duplicated = [...locationMap].flatMap(([name, locations]) => {
    const fileCount = frozenSet(locations.map((loc) => loc.file)).size;
    return fileCount >= 2 ? [{ name, fileCount, locations }] : [];
  });

  const isAllowed = ({ name }) => ALLOWED_DUPLICATE_NAMES.has(name);
  const allowed = duplicated.filter(isAllowed);
  // Sort by number of files (most duplicated first), then alphabetically
  const duplicates = duplicated
    .filter((entry) => !isAllowed(entry))
    .sort((a, b) => {
      if (b.fileCount !== a.fileCount) return b.fileCount - a.fileCount;
      return a.name.localeCompare(b.name);
    });

  // Convert to violations format for reporting
  const violations = duplicates.map((dup) => ({
    file: dup.locations[0].file,
    line: dup.locations[0].line,
    code: `${dup.name} (${dup.fileCount} files)`,
    reason: dup.locations.map((loc) => `${loc.file}:${loc.line}`).join(", "),
  }));

  return { violations, allowed, duplicates };
};

// ============================================
// Tests
// ============================================

describe("duplicate-methods", () => {
  test("groups duplicate locations while counting distinct files", () => {
    const sources = {
      "src/first.js":
        "function repeatedMethod() {}\nfunction repeatedMethod() {}",
      "test/second.js": "const repeatedMethod = () => 1;",
    };
    const { duplicates } = findDuplicateMethods(
      Object.keys(sources),
      (file) => sources[file],
    );
    expect(duplicates).toEqual([
      {
        name: "repeatedMethod",
        fileCount: 2,
        locations: [
          { name: "repeatedMethod", file: "src/first.js", line: 1 },
          { name: "repeatedMethod", file: "src/first.js", line: 2 },
          { name: "repeatedMethod", file: "test/second.js", line: 1 },
        ],
      },
    ]);
  });

  test("does not report repeated definitions confined to one file", () => {
    expect(
      findDuplicateMethods(
        ["src/local.js"],
        () => "function localMethod() {}\nfunction localMethod() {}",
      ),
    ).toEqual({ violations: [], allowed: [], duplicates: [] });
  });

  test("orders duplicates by distinct file count then name", () => {
    const sources = {
      "src/first.js":
        "function zebraDuplicate() {}\nfunction alphaDuplicate() {}\nfunction commonDuplicate() {}",
      "src/second.js":
        "function zebraDuplicate() {}\nfunction alphaDuplicate() {}\nfunction commonDuplicate() {}",
      "src/third.js": "function commonDuplicate() {}",
    };
    const { violations } = findDuplicateMethods(
      Object.keys(sources),
      (file) => sources[file],
    );
    expect(violations).toEqual([
      {
        file: "src/first.js",
        line: 3,
        code: "commonDuplicate (3 files)",
        reason: "src/first.js:3, src/second.js:3, src/third.js:1",
      },
      {
        file: "src/first.js",
        line: 2,
        code: "alphaDuplicate (2 files)",
        reason: "src/first.js:2, src/second.js:2",
      },
      {
        file: "src/first.js",
        line: 1,
        code: "zebraDuplicate (2 files)",
        reason: "src/first.js:1, src/second.js:1",
      },
    ]);
  });

  test("tracks allowed names without reporting them as violations", () => {
    const { allowed, duplicates, violations } = findDuplicateMethods(
      ["src/first.js", "src/second.js"],
      () => "function init() {}",
    );
    expect(allowed).toEqual([
      {
        name: "init",
        fileCount: 2,
        locations: [
          { name: "init", file: "src/first.js", line: 1 },
          { name: "init", file: "src/second.js", line: 1 },
        ],
      },
    ]);
    expect(duplicates).toEqual([]);
    expect(violations).toEqual([]);
  });

  test("extractFunctionNames finds function declarations", () => {
    const source = `
function hello() {}
const greet = () => {};
async function fetchData() {}
const getData = async () => {};
`;
    const functions = extractFunctionNames(source);
    const names = functions.map((f) => f.name);

    expect(names).toContain("hello");
    expect(names).toContain("greet");
    expect(names).toContain("fetchData");
    expect(names).toContain("getData");
  });

  test("extractFunctionNames ignores comments", () => {
    const source = `
// function commented() {}
* function inBlockComment() {}
function actual() {}
`;
    const functions = extractFunctionNames(source);
    const names = functions.map((f) => f.name);

    expect(names).not.toContain("commented");
    expect(names).not.toContain("inBlockComment");
    expect(names).toContain("actual");
  });

  test("No duplicate function names across files", () => {
    const { violations, duplicates } = findDuplicateMethods();

    if (duplicates.length > 0) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`DUPLICATE FUNCTION NAMES: ${duplicates.length} found`);
      console.log(`${"=".repeat(60)}\n`);
      for (const dup of duplicates) {
        console.log(`"${dup.name}" - ${dup.fileCount} files:`);
        for (const loc of dup.locations) {
          console.log(`  - ${loc.file}:${loc.line}`);
        }
        console.log("");
      }
    }

    assertNoViolations(violations, {
      singular: "duplicate function name",
      limit: 50,
      fixHint:
        "Unify duplicate functions into a shared utility, or rename to be more specific",
    });
  });
});
