import {
  ALLOWED_LET_PATTERNS,
  ALLOWED_MUTABLE_VAR_FILES,
} from "#test/code-quality/code-quality-exceptions.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

// Set to true once all lets are removed to enforce const-only style
const ENFORCE_NO_LET = false;

/**
 * Find all var/let declarations in a file
 * Returns array of { line, lineNumber, column, keyword }
 */
const findMutableVarDeclarations = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for both var and let
    for (const keyword of ["var", "let"]) {
      const regex = new RegExp(`\\b${keyword}\\s+`, "g");
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Skip if in a comment
        const beforeMatch = line.substring(0, match.index);
        if (beforeMatch.includes("//")) continue;
        if (beforeMatch.includes("/*") && !beforeMatch.includes("*/")) continue;

        results.push({
          line: line.trim(),
          lineNumber: i + 1,
          column: match.index + 1,
          keyword,
        });
      }
    }
  }

  return results;
};

/**
 * Check if a let declaration is allowed by our patterns
 */
const isAllowedLetPattern = (line) => {
  const trimmed = line.trim();
  return ALLOWED_LET_PATTERNS.some((pattern) => pattern.test(trimmed));
};

/**
 * Analyze all JS files and find var/let usage
 */
const analyzeMutableVarUsage = () => {
  const varViolations = [];
  const varAllowed = [];
  const letWarnings = [];

  // Exclude this test file since it contains var/let examples in test strings
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/code-quality/let-usage.test.js");

  for (const relativePath of allJsFiles) {
    // Skip fully allowed files
    if (ALLOWED_MUTABLE_VAR_FILES.has(relativePath)) {
      // Still count them for reporting
      const fullPath = path.join(rootDir, relativePath);
      const source = fs.readFileSync(fullPath, "utf-8");
      const declarations = findMutableVarDeclarations(source);
      for (const decl of declarations) {
        varAllowed.push({
          file: relativePath,
          line: decl.lineNumber,
          code: decl.line,
          keyword: decl.keyword,
        });
      }
      continue;
    }

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const declarations = findMutableVarDeclarations(source);

    for (const decl of declarations) {
      const entry = {
        file: relativePath,
        line: decl.lineNumber,
        code: decl.line,
        keyword: decl.keyword,
      };

      if (decl.keyword === "var") {
        // var is always a violation outside allowed files
        varViolations.push(entry);
      } else if (decl.keyword === "let") {
        // let is a warning unless it matches allowed patterns
        if (!isAllowedLetPattern(decl.line)) {
          letWarnings.push(entry);
        }
      }
    }
  }

  return { varViolations, varAllowed, letWarnings };
};

const testCases = [
  {
    name: "find-mutable-vars-in-source",
    description: "Correctly identifies var and let declarations in source code",
    test: () => {
      const source = `
const a = 1;
let b = 2;
var c = 3;
for (let i = 0; i < 10; i++) {}
for (var j = 0; j < 10; j++) {}
// let comment = "ignored";
// var comment = "ignored";
const d = "not a declaration";
      `;
      const results = findMutableVarDeclarations(source);
      const lets = results.filter((r) => r.keyword === "let");
      const vars = results.filter((r) => r.keyword === "var");
      expectTrue(
        lets.length === 2,
        `Expected 2 let declarations, found ${lets.length}`,
      );
      expectTrue(
        vars.length === 2,
        `Expected 2 var declarations, found ${vars.length}`,
      );
    },
  },
  {
    name: "allowed-let-patterns-work",
    description: "Allowed patterns correctly match exempted let usage",
    test: () => {
      const allowedLines = [
        "let gallery, currentImage, imagePopup;",
        "let state = null;",
      ];
      for (const line of allowedLines) {
        expectTrue(
          isAllowedLetPattern(line),
          `Expected "${line}" to be allowed`,
        );
      }

      const disallowedLines = [
        "let count = 0;",
        "let html = '';",
        "for (let i = 0; i < 10; i++) {}",
      ];
      for (const line of disallowedLines) {
        expectTrue(
          !isAllowedLetPattern(line),
          `Expected "${line}" to NOT be allowed`,
        );
      }
    },
  },
  {
    name: "no-new-var-declarations",
    description: "No new var declarations outside whitelisted files",
    test: () => {
      const { varViolations } = analyzeMutableVarUsage();

      if (varViolations.length > 0) {
        console.log(
          `\n  Found ${varViolations.length} non-whitelisted var declarations:`,
        );
        for (const v of varViolations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log(
          "\n  To fix: refactor to const, or add file to ALLOWED_MUTABLE_VAR_FILES in code-quality-exceptions.js\n",
        );
      }

      expectTrue(
        varViolations.length === 0,
        `Found ${varViolations.length} non-whitelisted var declarations. See list above.`,
      );
    },
  },
  {
    name: "report-let-usage",
    description: "Scans project files and reports let usage",
    test: () => {
      const { letWarnings } = analyzeMutableVarUsage();

      if (letWarnings.length > 0) {
        console.log(
          `\n  Found ${letWarnings.length} let declarations to review:`,
        );
        for (const w of letWarnings) {
          console.log(`     - ${w.file}:${w.line}`);
          console.log(`       ${w.code}`);
        }
        console.log("");
      }

      // If enforcing, fail on any let usage
      if (ENFORCE_NO_LET && letWarnings.length > 0) {
        throw new Error(
          `Found ${letWarnings.length} let declarations. ` +
            `Refactor to use const or add to ALLOWED_LET_PATTERNS.`,
        );
      }

      expectTrue(true, "Let usage scan completed");
    },
  },
  {
    name: "report-allowed-mutable-vars",
    description: "Reports whitelisted var/let declarations for tracking",
    test: () => {
      const { varAllowed } = analyzeMutableVarUsage();

      console.log(`\n  Whitelisted var/let declarations: ${varAllowed.length}`);
      console.log("  These should be refactored to const over time:\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of varAllowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(`${a.line} (${a.keyword})`);
      }

      for (const [file, lines] of Object.entries(byFile)) {
        console.log(`     ${file}: lines ${lines.join(", ")}`);
      }
      console.log("");

      expectTrue(true, "Reported whitelisted var/let declarations");
    },
  },
];

createTestRunner("let-usage", testCases);
