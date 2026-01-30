import { describe, expect, test } from "bun:test";
import {
  extractFunctions,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
} from "#test/test-utils.js";
import {
  filter,
  filterMap,
  flatMap,
  map,
  pipe,
  pluralize,
} from "#toolkit/fp/array.js";
import { frozenSet } from "#toolkit/fp/set.js";

// Configuration
const MAX_LINES = 30;
const PREFERRED_LINES = 20;

// Functions that are intentionally long (e.g., complex templates, data builders)
// These are baseline exceptions - new long functions should be refactored
const IGNORED_FUNCTIONS = frozenSet([
  "createMenuPdfTemplate", // PDF template with many HTML sections
  "buildMenuPdfData", // PDF data structure with many fields
  "buildFilterUIData", // Complex filter UI data structure builder
  "registerTransforms", // Eleventy config registration with multiple transforms
  "acceptNode", // Inline callback in tree walker (false positive)
]);

// Test helper to join source code lines
const testSource = (lines) => lines.join("\n");

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
    const calculateOwnLines = (functions) =>
      pipe(
        map((func) => {
          const nestedLines = functions.reduce((sum, other) => {
            const isNested =
              other !== func &&
              other.startLine > func.startLine &&
              other.endLine < func.endLine;
            return isNested ? sum + other.lineCount : sum;
          }, 0);
          return { ...func, ownLines: func.lineCount - nestedLines };
        }),
      )(functions);

    const violations = pipe(
      filter((f) => !f.startsWith("src/_lib/public/")),
      flatMap((relativePath) => {
        const fullPath = path.join(rootDir, relativePath);
        const source = fs.readFileSync(fullPath, "utf-8");
        const functions = calculateOwnLines(extractFunctions(source));
        return pipe(
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
      }),
    )(SRC_JS_FILES());

    if (violations.length > 0) {
      const sorted = violations.toSorted((a, b) => b.lineCount - a.lineCount);
      const formatFunctions = pluralize("function");
      const lines = [
        `Found ${formatFunctions(violations.length)} exceeding ${MAX_LINES} lines:\n`,
        ...sorted.flatMap((v) => [
          `  ${v.name} (${v.lineCount} lines)`,
          `    └─ ${v.file}:${v.startLine}`,
        ]),
        "",
        `Preferred maximum: ${PREFERRED_LINES} lines`,
        `Hard limit: ${MAX_LINES} lines`,
      ];
      console.log(`\n${lines.join("\n")}\n`);
    }

    expect(violations.length).toBe(0);
  });
});
