/**
 * Detects functions/methods with the same name across different files.
 *
 * Duplicate function names across files indicate potential opportunities
 * to unify code into shared utilities. This scanner identifies all cases
 * where the same function name appears in multiple files.
 */
import { describe, expect, test } from "bun:test";
import { assertNoViolations, readSource } from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

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
  "createElement",
  "getJsConfigFilter",
  "transformHtml", // test helper with same name but different implementations
  // Template fixture function names used in code-quality test cases
  "outer",
  "innerNested",
  "useIt",
]);

// Directories to exclude from analysis
const EXCLUDED_DIRS = frozenSet(["ecommerce-backend"]);

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
const extractFunctionNames = (source) => {
  const functions = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    const funcMatch =
      line.match(FUNCTION_DECL_PATTERN) || line.match(ARROW_OR_EXPR_PATTERN);

    if (funcMatch) {
      functions.push({ name: funcMatch[1], line: lineNum });
    }
  }

  return functions;
};

/**
 * Find all duplicate function names (appearing in 2+ different files).
 */
const findDuplicateMethods = () => {
  const allFiles = ALL_JS_FILES();

  // Build location map
  const locationMap = new Map();
  for (const file of allFiles) {
    if (file === THIS_FILE) continue;
    if ([...EXCLUDED_DIRS].some((dir) => file.startsWith(`${dir}/`))) continue;

    const source = readSource(file);
    const functions = extractFunctionNames(source);

    for (const func of functions) {
      if (!locationMap.has(func.name)) {
        locationMap.set(func.name, []);
      }
      locationMap.get(func.name).push({ file, line: func.line });
    }
  }
  const duplicates = [];
  const allowed = [];

  for (const [name, locations] of locationMap) {
    // Get unique files where this function appears
    const uniqueFiles = new Set(locations.map((loc) => loc.file));

    if (uniqueFiles.size >= 2) {
      const entry = {
        name,
        fileCount: uniqueFiles.size,
        locations,
      };

      if (ALLOWED_DUPLICATE_NAMES.has(name)) {
        allowed.push(entry);
      } else {
        duplicates.push(entry);
      }
    }
  }

  // Sort by number of files (most duplicated first), then alphabetically
  duplicates.sort((a, b) => {
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
