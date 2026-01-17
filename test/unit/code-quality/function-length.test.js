import { describe, expect, test } from "bun:test";
import {
  extractFunctions,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
} from "#test/test-utils.js";
import { filterMap, map, pipe, pluralize } from "#utils/array-utils.js";

// Configuration
const MAX_LINES = 30;
const PREFERRED_LINES = 20;

// Functions that are intentionally long (e.g., complex templates, data builders)
// These are baseline exceptions - new long functions should be refactored
const IGNORED_FUNCTIONS = new Set([
  "createMenuPdfTemplate", // PDF template with many HTML sections
  "buildMenuPdfData", // PDF data structure with many fields
  "buildFilterUIData", // Complex filter UI data structure builder
  "registerTransforms", // Eleventy config registration with multiple transforms
]);

// Test helper to join source code lines
const testSource = (lines) => lines.join("\n");

/**
 * Calculate "own lines" for each function by subtracting nested function lines.
 * A nested function is one that starts and ends within another function's range.
 * Optimized using pipe() and combined filter+reduce in single pass.
 */
const calculateOwnLines = (functions) =>
  pipe(
    map((func) => {
      // Combine filter+reduce in single pass to count nested lines
      const nestedLines = functions.reduce((sum, other) => {
        // Check if other function is nested within this function
        const isNested =
          other !== func &&
          other.startLine > func.startLine &&
          other.endLine < func.endLine;

        return isNested ? sum + other.lineCount : sum;
      }, 0);

      return {
        ...func,
        ownLines: func.lineCount - nestedLines,
      };
    }),
  )(functions);

/**
 * Analyze the codebase for overly long functions.
 * Returns violations using functional composition.
 */
const analyzeFunctionLengths = () => {
  const filesToCheck = SRC_JS_FILES().filter(
    (f) => !f.startsWith("src/_lib/public/"),
  );

  const allViolations = [];

  for (const relativePath of filesToCheck) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const functions = calculateOwnLines(extractFunctions(source));

    const fileViolations = pipe(
      filterMap(
        (func) =>
          func.ownLines > MAX_LINES && !IGNORED_FUNCTIONS.has(func.name),
        (func) => ({
          name: func.name,
          lineCount: func.ownLines,
          file: relativePath,
          startLine: func.startLine,
        }),
      ),
    )(functions);

    allViolations.push(...fileViolations);
  }

  return allViolations;
};

/**
 * Format violations for readable output.
 */
const formatViolations = (violations) => {
  if (violations.length === 0) {
    return "No function length violations found.";
  }

  // Sort by line count (descending)
  violations.sort((a, b) => b.lineCount - a.lineCount);

  const formatFunctions = pluralize("function");
  const lines = [
    `Found ${formatFunctions(violations.length)} exceeding ${MAX_LINES} lines:\n`,
  ];

  for (const v of violations) {
    lines.push(`  ${v.name} (${v.lineCount} lines)`);
    lines.push(`    └─ ${v.file}:${v.startLine}`);
  }

  lines.push("");
  lines.push(`Preferred maximum: ${PREFERRED_LINES} lines`);
  lines.push(`Hard limit: ${MAX_LINES} lines`);
  lines.push("");
  lines.push(
    "Consider refactoring long functions into smaller, focused units.",
  );

  return lines.join("\n");
};

describe("function-length", () => {
  test("extractFunctions finds simple function declarations", () => {
    const source = testSource([
      "function hello() {",
      '  console.log("hi");',
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("hello");
    expect(functions[0].lineCount).toBe(3);
  });

  test("extractFunctions finds arrow functions assigned to variables", () => {
    const source = testSource([
      "const greet = (name) => {",
      '  return "Hello " + name;',
      "};",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("greet");
  });

  test("extractFunctions finds async functions", () => {
    const source = testSource([
      "async function fetchData() {",
      "  const res = await fetch(url);",
      "  return res.json();",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("fetchData");
  });

  test("extractFunctions finds exported arrow functions", () => {
    const source = testSource([
      "export const helper = (x) => {",
      "  return x * 2;",
      "};",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("helper");
  });

  test("extractFunctions ignores braces inside strings", () => {
    const source = testSource([
      "function test() {",
      '  const a = "{ not a brace }";',
      "  const b = '{ also not }';",
      "  return true;",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(5);
  });

  test("extractFunctions ignores braces inside template literals", () => {
    const source = testSource([
      "const render = (data) => {",
      "  return `<div>${ data.value }</div>`;",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("render");
    expect(functions[0].lineCount).toBe(3);
  });

  test("extractFunctions ignores braces inside single-line comments", () => {
    const source = testSource([
      "function process() {",
      "  // This comment has { braces } in it",
      "  return 42;",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(4);
  });

  test("extractFunctions ignores braces inside multi-line comments", () => {
    const source = testSource([
      "function calculate() {",
      "  /* This is a comment",
      "     with { braces } spanning",
      "     multiple lines */",
      "  return 1 + 1;",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(6);
  });

  test("extractFunctions handles nested functions correctly", () => {
    const source = testSource([
      "function outer() {",
      "  const inner = () => {",
      '    return "nested";',
      "  };",
      "  return inner();",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(2);

    const outer = functions.find((f) => f.name === "outer");
    const inner = functions.find((f) => f.name === "inner");

    expect(outer).toBeDefined();
    expect(inner).toBeDefined();
    expect(outer.lineCount).toBe(6);
    expect(inner.lineCount).toBe(3);
  });

  test("extractFunctions finds multiple top-level functions", () => {
    const source = testSource([
      "function first() {",
      "  return 1;",
      "}",
      "",
      "const second = () => {",
      "  return 2;",
      "};",
      "",
      "async function third() {",
      "  return 3;",
      "}",
    ]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(3);
    expect(functions.map((f) => f.name).sort()).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  test("extractFunctions reports accurate startLine and endLine", () => {
    const source = testSource(["const foo = () => {", '  return "bar";', "};"]);
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].startLine).toBe(1);
    expect(functions[0].endLine).toBe(3);
    expect(functions[0].lineCount).toBe(3);
  });

  test(`Check functions do not exceed ${MAX_LINES} lines`, () => {
    const violations = analyzeFunctionLengths();

    // Log violations for visibility
    if (violations.length > 0) {
      console.log(`\n${formatViolations(violations)}\n`);
    }

    expect(violations.length).toBe(0);
  });
});
