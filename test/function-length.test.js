import { createTestRunner, expectTrue, fs, path } from "./test-utils.js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Configuration
const MAX_LINES = 50;
const PREFERRED_LINES = 30;

// Directories to skip when scanning for JS files
const SKIP_DIRS = new Set(["node_modules", "_site", "test"]);
const SKIP_PATHS = new Set(["src/assets/js"]);

// Functions that are intentionally long (e.g., complex templates, data builders)
// These are baseline exceptions - new long functions should be refactored
const IGNORED_FUNCTIONS = new Set([
  "createMenuPdfTemplate", // PDF template with many HTML sections
  "buildMenuPdfData", // PDF data structure with many fields
  "createFilterConfig", // Factory that creates multiple collection handlers
  "buildFilterUIData", // Complex filter UI data structure builder
  "buildProductMeta", // Schema.org metadata with many optional fields
]);

const shouldSkipDir = (name, filePath) => {
  if (name.startsWith(".")) return true;
  if (SKIP_DIRS.has(name)) return true;
  if (SKIP_PATHS.has(path.relative(rootDir, filePath))) return true;
  return false;
};

const getJsFiles = (dir, files = []) => {
  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);

    if (fs.statSync(filePath).isDirectory()) {
      if (!shouldSkipDir(name, filePath)) {
        getJsFiles(filePath, files);
      }
    } else if (name.endsWith(".js")) {
      files.push(filePath);
    }
  }
  return files;
};

/**
 * Extract all function definitions from JavaScript source code.
 * Returns an array of { name, startLine, endLine, lineCount }.
 */
const extractFunctions = (source) => {
  const functions = [];
  const lines = source.split("\n");

  // Track brace depth to find function boundaries
  let currentFunction = null;
  let braceDepth = 0;
  let inString = false;
  let stringChar = null;
  let inTemplate = false;
  let templateDepth = 0;
  let inComment = false;
  let inMultilineComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for function start patterns (only when not inside a function or at depth 0/1)
    if (!currentFunction || braceDepth <= 1) {
      // Named function declaration: function name(
      const funcDeclMatch = line.match(
        /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
      );
      // Arrow function assigned to const/let/var: const name = (...) =>
      const arrowMatch = line.match(
        /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/,
      );
      // Method in object/class: name( or name: function(
      const methodMatch = line.match(
        /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/,
      );
      // Object method: name: function( or name: (
      const objMethodMatch = line.match(
        /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/,
      );

      const match = funcDeclMatch || arrowMatch || methodMatch || objMethodMatch;

      if (match && !currentFunction) {
        currentFunction = {
          name: match[1],
          startLine: lineNum,
          endLine: null,
          lineCount: 0,
        };
        // Reset brace depth for this function
        braceDepth = 0;
      }
    }

    // Count braces (simplified - doesn't handle all edge cases but good enough)
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : "";
      const nextChar = j < line.length - 1 ? line[j + 1] : "";

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === "/" && nextChar === "/" && !inMultilineComment) {
          break; // Rest of line is comment
        }
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
        if (!inTemplate) {
          inTemplate = true;
          templateDepth = 1;
        } else {
          inTemplate = false;
          templateDepth = 0;
        }
        continue;
      }

      if (inString) continue;

      // Count braces
      if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;

        if (currentFunction && braceDepth === 0) {
          currentFunction.endLine = lineNum;
          currentFunction.lineCount =
            currentFunction.endLine - currentFunction.startLine + 1;
          functions.push(currentFunction);
          currentFunction = null;
        }
      }
    }
  }

  return functions;
};

/**
 * Analyze the codebase for overly long functions.
 * Returns an object with violations.
 */
const analyzeFunctionLengths = () => {
  const jsFiles = getJsFiles(rootDir);
  const violations = [];

  for (const filePath of jsFiles) {
    const source = fs.readFileSync(filePath, "utf-8");
    const functions = extractFunctions(source);

    for (const func of functions) {
      if (func.lineCount > MAX_LINES && !IGNORED_FUNCTIONS.has(func.name)) {
        violations.push({
          name: func.name,
          lineCount: func.lineCount,
          file: path.relative(rootDir, filePath),
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
  lines.push("Consider refactoring long functions into smaller, focused units.");

  return lines.join("\n");
};

// Run the analysis once for use in tests
const violations = analyzeFunctionLengths();

// Log violations for visibility
if (violations.length > 0) {
  console.log("\n" + formatViolations(violations) + "\n");
}

const testCases = [
  {
    name: "extract-simple-function",
    description: "extractFunctions finds simple function declarations",
    test: () => {
      const source = `
function hello() {
  console.log("hi");
}
      `;
      const functions = extractFunctions(source);
      expectTrue(functions.length === 1, "Should find 1 function");
      expectTrue(functions[0].name === "hello", "Should find hello");
      expectTrue(functions[0].lineCount === 3, "Should be 3 lines");
    },
  },
  {
    name: "extract-arrow-function",
    description: "extractFunctions finds arrow functions assigned to variables",
    test: () => {
      const source = `
const greet = (name) => {
  return "Hello " + name;
};
      `;
      const functions = extractFunctions(source);
      expectTrue(functions.length === 1, "Should find 1 function");
      expectTrue(functions[0].name === "greet", "Should find greet");
    },
  },
  {
    name: "extract-async-function",
    description: "extractFunctions finds async functions",
    test: () => {
      const source = `
async function fetchData() {
  const res = await fetch(url);
  return res.json();
}
      `;
      const functions = extractFunctions(source);
      expectTrue(functions.length === 1, "Should find 1 function");
      expectTrue(functions[0].name === "fetchData", "Should find fetchData");
    },
  },
  {
    name: "extract-exported-function",
    description: "extractFunctions finds exported arrow functions",
    test: () => {
      const source = `
export const helper = (x) => {
  return x * 2;
};
      `;
      const functions = extractFunctions(source);
      expectTrue(functions.length === 1, "Should find 1 function");
      expectTrue(functions[0].name === "helper", "Should find helper");
    },
  },
  {
    name: "ignore-strings-with-braces",
    description: "extractFunctions ignores braces inside strings",
    test: () => {
      const source = `
function test() {
  const a = "{ not a brace }";
  const b = '{ also not }';
  return true;
}
      `;
      const functions = extractFunctions(source);
      expectTrue(functions.length === 1, "Should find 1 function");
      expectTrue(functions[0].lineCount === 5, "Should be 5 lines");
    },
  },
  {
    name: "check-violations",
    description: `Check functions do not exceed ${MAX_LINES} lines`,
    test: () => {
      expectTrue(
        violations.length === 0,
        `Found ${violations.length} function(s) exceeding ${MAX_LINES} lines. See list above.`,
      );
    },
  },
];

createTestRunner("function-length", testCases);
