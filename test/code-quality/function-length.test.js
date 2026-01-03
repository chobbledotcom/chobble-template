import { describe, expect, test } from "bun:test";
import { fs, path, rootDir, SRC_JS_FILES } from "#test/test-utils.js";

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
 * Extract all function definitions from JavaScript source code.
 * Uses a stack to properly handle nested functions.
 * Returns an array of { name, startLine, endLine, lineCount }.
 */
const extractFunctions = (source) => {
  const functions = [];
  const lines = source.split("\n");
  const stack = []; // Stack of { name, startLine, braceDepth }

  let globalBraceDepth = 0;
  let inString = false;
  let stringChar = null;
  let inTemplate = false;
  let inMultilineComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for function start patterns
    const funcDeclMatch = line.match(
      /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    );
    // Only match arrow functions with braces (multi-line bodies)
    const arrowMatch = line.match(
      /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/,
    );
    const methodMatch = line.match(
      /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/,
    );
    const objMethodMatch = line.match(
      /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/,
    );

    const match = funcDeclMatch || arrowMatch || methodMatch || objMethodMatch;

    if (match) {
      stack.push({
        name: match[1],
        startLine: lineNum,
        openBraceDepth: null, // Will be set when we see the opening brace
      });
    }

    // Process characters for brace counting
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : "";
      const nextChar = j < line.length - 1 ? line[j + 1] : "";

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === "/" && nextChar === "/" && !inMultilineComment) break;
        if (char === "/" && nextChar === "*" && !inMultilineComment) {
          inMultilineComment = true;
          j++;
          continue;
        }
        if (char === "*" && nextChar === "/" && inMultilineComment) {
          inMultilineComment = false;
          j++;
          continue;
        }
      }
      if (inMultilineComment) continue;

      // Handle strings
      if (!inTemplate && (char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
        continue;
      }

      // Handle template literals
      if (char === "`" && prevChar !== "\\") {
        inTemplate = !inTemplate;
        continue;
      }

      if (inString) continue;

      // Count braces
      if (char === "{") {
        globalBraceDepth++;
        // Record opening brace depth for pending functions
        for (const item of stack) {
          if (item.openBraceDepth === null) {
            item.openBraceDepth = globalBraceDepth;
          }
        }
      } else if (char === "}") {
        // Check if this closes any function on the stack
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].openBraceDepth === globalBraceDepth) {
            const completed = stack.splice(k, 1)[0];
            functions.push({
              name: completed.name,
              startLine: completed.startLine,
              endLine: lineNum,
              lineCount: lineNum - completed.startLine + 1,
            });
            break;
          }
        }
        globalBraceDepth--;
      }
    }
  }

  return functions;
};

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
  for (const relativePath of SRC_JS_FILES.filter(
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
