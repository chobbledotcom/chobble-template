import { describe, expect, test } from "bun:test";
import {
  extractFunctions,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
} from "#test/test-utils.js";

// Configuration
const MAX_LINES = 30;
const PREFERRED_LINES = 20;

// Functions that are intentionally long (e.g., complex templates, data builders)
// These are baseline exceptions - new long functions should be refactored
const IGNORED_FUNCTIONS = new Set([
  "createMenuPdfTemplate", // PDF template with many HTML sections
  "buildMenuPdfData", // PDF data structure with many fields
  "buildFilterUIData", // Complex filter UI data structure builder
]);

/**
 * Calculate "own lines" for each function by subtracting nested function lines.
 * A nested function is one that starts and ends within another function's range.
 */
const calculateOwnLines = (functions) => {
  return functions.map((func) => {
    const nestedLines = functions
      .filter(
        (other) =>
          other !== func &&
          other.startLine > func.startLine &&
          other.endLine < func.endLine,
      )
      .reduce((sum, nested) => sum + nested.lineCount, 0);

    return {
      ...func,
      ownLines: func.lineCount - nestedLines,
    };
  });
};

/**
 * Analyze the codebase for overly long functions.
 * Returns an object with violations.
 */
const analyzeFunctionLengths = () => {
  const violations = [];

  // Only check library code, not frontend assets
  for (const relativePath of SRC_JS_FILES().filter(
    (f) => !f.startsWith("src/assets/"),
  )) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const functions = calculateOwnLines(extractFunctions(source));

    for (const func of functions) {
      if (func.ownLines > MAX_LINES && !IGNORED_FUNCTIONS.has(func.name)) {
        violations.push({
          name: func.name,
          lineCount: func.ownLines,
          file: relativePath,
          startLine: func.startLine,
        });
      }
    }
  }

  return violations;
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

  const lines = [
    `Found ${violations.length} function(s) exceeding ${MAX_LINES} lines:\n`,
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
    const source = `
function hello() {
  console.log("hi");
}
    `;
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("hello");
    expect(functions[0].lineCount).toBe(3);
  });

  test("extractFunctions finds arrow functions assigned to variables", () => {
    const source = `
const greet = (name) => {
  return "Hello " + name;
};
    `;
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("greet");
  });

  test("extractFunctions finds async functions", () => {
    const source = `
async function fetchData() {
  const res = await fetch(url);
  return res.json();
}
    `;
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("fetchData");
  });

  test("extractFunctions finds exported arrow functions", () => {
    const source = `
export const helper = (x) => {
  return x * 2;
};
    `;
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("helper");
  });

  test("extractFunctions ignores braces inside strings", () => {
    const source = `
function test() {
  const a = "{ not a brace }";
  const b = '{ also not }';
  return true;
}
    `;
    const functions = extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(5);
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
