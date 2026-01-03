import { describe, expect, test } from "bun:test";
import { fs, path, rootDir, SRC_JS_FILES } from "#test/test-utils.js";

// ============================================
// Function Length Checker Factory
// Consolidates function extraction and length analysis
// ============================================

/**
 * Factory that creates a function length checker with methods for:
 * - Extracting function definitions from source
 * - Calculating own lines (excluding nested functions)
 * - Analyzing files for length violations
 * - Formatting violation reports
 */
const createFunctionLengthChecker = (jsFiles, config = {}) => {
  const {
    maxLines = 30,
    preferredLines = 20,
    ignoredFunctions = new Set([
      "createMenuPdfTemplate",
      "buildMenuPdfData",
      "buildFilterUIData",
    ]),
    fileFilter = (f) => !f.startsWith("src/assets/"),
  } = config;

  // ----------------------------------------
  // Extraction methods
  // ----------------------------------------

  const extractFunctions = (source) => {
    const functions = [];
    const lines = source.split("\n");
    const stack = [];

    let globalBraceDepth = 0;
    let inString = false;
    let stringChar = null;
    let inTemplate = false;
    let inMultilineComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const funcDeclMatch = line.match(
        /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
      );
      const arrowMatch = line.match(
        /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/,
      );
      const methodMatch = line.match(
        /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/,
      );
      const objMethodMatch = line.match(
        /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/,
      );

      const match =
        funcDeclMatch || arrowMatch || methodMatch || objMethodMatch;
      if (match) {
        stack.push({ name: match[1], startLine: lineNum, openBraceDepth: null });
      }

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : "";
        const nextChar = j < line.length - 1 ? line[j + 1] : "";

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

        if (char === "`" && prevChar !== "\\") {
          inTemplate = !inTemplate;
          continue;
        }

        if (inString) continue;

        if (char === "{") {
          globalBraceDepth++;
          for (const item of stack) {
            if (item.openBraceDepth === null) item.openBraceDepth = globalBraceDepth;
          }
        } else if (char === "}") {
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

  // ----------------------------------------
  // Calculation methods
  // ----------------------------------------

  const calculateOwnLines = (functions) =>
    functions.map((func) => {
      const nestedLines = functions
        .filter(
          (other) =>
            other !== func &&
            other.startLine > func.startLine &&
            other.endLine < func.endLine,
        )
        .reduce((sum, nested) => sum + nested.lineCount, 0);
      return { ...func, ownLines: func.lineCount - nestedLines };
    });

  // ----------------------------------------
  // Analysis methods
  // ----------------------------------------

  const analyzeFunctionLengths = () => {
    const violations = [];

    for (const relativePath of jsFiles.filter(fileFilter)) {
      const fullPath = path.join(rootDir, relativePath);
      const source = fs.readFileSync(fullPath, "utf-8");
      const functions = calculateOwnLines(extractFunctions(source));

      for (const func of functions) {
        if (func.ownLines > maxLines && !ignoredFunctions.has(func.name)) {
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

  const formatViolations = (violations) => {
    if (violations.length === 0) return "No function length violations found.";

    violations.sort((a, b) => b.lineCount - a.lineCount);

    const lines = [
      `Found ${violations.length} function(s) exceeding ${maxLines} lines:\n`,
    ];
    for (const v of violations) {
      lines.push(`  ${v.name} (${v.lineCount} lines)`);
      lines.push(`    └─ ${v.file}:${v.startLine}`);
    }
    lines.push("");
    lines.push(`Preferred maximum: ${preferredLines} lines`);
    lines.push(`Hard limit: ${maxLines} lines`);
    lines.push("");
    lines.push(
      "Consider refactoring long functions into smaller, focused units.",
    );

    return lines.join("\n");
  };

  return {
    extractFunctions,
    calculateOwnLines,
    analyzeFunctionLengths,
    formatViolations,
    config: { maxLines, preferredLines },
  };
};

// Create checker instance with default config
const functionLengthChecker = createFunctionLengthChecker(SRC_JS_FILES);

describe("function-length", () => {
  test("extractFunctions finds simple function declarations", () => {
    const source = `
function hello() {
  console.log("hi");
}
    `;
    const functions = functionLengthChecker.extractFunctions(source);
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
    const functions = functionLengthChecker.extractFunctions(source);
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
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("fetchData");
  });

  test("extractFunctions finds exported arrow functions", () => {
    const source = `
export const helper = (x) => {
  return x * 2;
};
    `;
    const functions = functionLengthChecker.extractFunctions(source);
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
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(5);
  });

  test(`Check functions do not exceed ${functionLengthChecker.config.maxLines} lines`, () => {
    const violations = functionLengthChecker.analyzeFunctionLengths();

    // Log violations for visibility
    if (violations.length > 0) {
      console.log(`\n${functionLengthChecker.formatViolations(violations)}\n`);
    }

    expect(violations.length).toBe(0);
  });
});
