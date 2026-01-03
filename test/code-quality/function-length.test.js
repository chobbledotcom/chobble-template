import { describe, expect, test } from "bun:test";
import { fs, path, rootDir, SRC_JS_FILES } from "#test/test-utils.js";

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

  const extractFunctions = (source) => {
    const functions = [],
      lines = source.split("\n"),
      stack = [];
    let globalBraceDepth = 0,
      inString = false,
      stringChar = null,
      inTemplate = false,
      inMultilineComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i],
        lineNum = i + 1;
      const match =
        line.match(
          /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
        ) ||
        line.match(
          /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/,
        ) ||
        line.match(
          /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/,
        ) ||
        line.match(
          /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/,
        );
      if (match)
        stack.push({
          name: match[1],
          startLine: lineNum,
          openBraceDepth: null,
        });

      for (let j = 0; j < line.length; j++) {
        const char = line[j],
          prevChar = j > 0 ? line[j - 1] : "",
          nextChar = j < line.length - 1 ? line[j + 1] : "";
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
        if (
          !inTemplate &&
          (char === '"' || char === "'") &&
          prevChar !== "\\"
        ) {
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
          for (const item of stack)
            if (item.openBraceDepth === null)
              item.openBraceDepth = globalBraceDepth;
        } else if (char === "}") {
          for (let k = stack.length - 1; k >= 0; k--) {
            if (stack[k].openBraceDepth === globalBraceDepth) {
              const c = stack.splice(k, 1)[0];
              functions.push({
                name: c.name,
                startLine: c.startLine,
                endLine: lineNum,
                lineCount: lineNum - c.startLine + 1,
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

  const calculateOwnLines = (functions) =>
    functions.map((func) => ({
      ...func,
      ownLines:
        func.lineCount -
        functions
          .filter(
            (o) =>
              o !== func &&
              o.startLine > func.startLine &&
              o.endLine < func.endLine,
          )
          .reduce((sum, n) => sum + n.lineCount, 0),
    }));

  const analyzeFunctionLengths = () => {
    const violations = [];
    for (const relativePath of jsFiles.filter(fileFilter)) {
      const source = fs.readFileSync(path.join(rootDir, relativePath), "utf-8");
      for (const func of calculateOwnLines(extractFunctions(source))) {
        if (func.ownLines > maxLines && !ignoredFunctions.has(func.name))
          violations.push({
            name: func.name,
            lineCount: func.ownLines,
            file: relativePath,
            startLine: func.startLine,
          });
      }
    }
    return violations;
  };

  const formatViolations = (violations) => {
    if (violations.length === 0) return "No function length violations found.";
    violations.sort((a, b) => b.lineCount - a.lineCount);
    return [
      `Found ${violations.length} function(s) exceeding ${maxLines} lines:\n`,
      ...violations.flatMap((v) => [
        `  ${v.name} (${v.lineCount} lines)`,
        `    └─ ${v.file}:${v.startLine}`,
      ]),
      "",
      `Preferred maximum: ${preferredLines} lines`,
      `Hard limit: ${maxLines} lines`,
      "",
      "Consider refactoring long functions into smaller, focused units.",
    ].join("\n");
  };

  return {
    extractFunctions,
    calculateOwnLines,
    analyzeFunctionLengths,
    formatViolations,
    config: { maxLines, preferredLines },
  };
};

const functionLengthChecker = createFunctionLengthChecker(SRC_JS_FILES);

describe("function-length", () => {
  test("extractFunctions finds simple function declarations", () => {
    const source = `\nfunction hello() {\n  console.log("hi");\n}\n    `;
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("hello");
    expect(functions[0].lineCount).toBe(3);
  });

  test("extractFunctions finds arrow functions assigned to variables", () => {
    const source = `\nconst greet = (name) => {\n  return "Hello " + name;\n};\n    `;
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("greet");
  });

  test("extractFunctions finds async functions", () => {
    const source = `\nasync function fetchData() {\n  const res = await fetch(url);\n  return res.json();\n}\n    `;
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("fetchData");
  });

  test("extractFunctions finds exported arrow functions", () => {
    const source = `\nexport const helper = (x) => {\n  return x * 2;\n};\n    `;
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].name).toBe("helper");
  });

  test("extractFunctions ignores braces inside strings", () => {
    const source = `\nfunction test() {\n  const a = "{ not a brace }";\n  const b = '{ also not }';\n  return true;\n}\n    `;
    const functions = functionLengthChecker.extractFunctions(source);
    expect(functions.length).toBe(1);
    expect(functions[0].lineCount).toBe(5);
  });

  test(`Check functions do not exceed ${functionLengthChecker.config.maxLines} lines`, () => {
    const violations = functionLengthChecker.analyzeFunctionLengths();
    if (violations.length > 0)
      console.log(`\n${functionLengthChecker.formatViolations(violations)}\n`);
    expect(violations.length).toBe(0);
  });
});
