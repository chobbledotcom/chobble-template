import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES, TEST_FILES } from "./test-utils.js";

// Set to true once all lets are removed to enforce const-only style
const ENFORCE_NO_LET = false;

// Files that are allowed to use let (third-party, legacy, or special cases)
const ALLOWED_LET_FILES = new Set([
  "src/assets/js/autosizes.js", // Third-party polyfill
]);

// Files that are allowed to use var (legacy code to be refactored)
const ALLOWED_VAR_FILES = new Set([
  "src/assets/js/search.js", // Legacy search form - uses var throughout
]);

// Specific let usages that are intentionally allowed
// Format: "filename:lineNumber" or patterns that are acceptable
const ALLOWED_LET_PATTERNS = [
  // Module-level state that must be mutable
  /^let\s+(ELEMENTS|PREVIOUS_GLOBAL_VARS)\s*=\s*null/, // theme-editor.js state
  /^let\s+(gallery|currentImage|imagePopup)\s*[,;=]/, // gallery.js DOM refs
  /^let\s+currentPopupIndex\s*=/, // gallery.js state
  // Closure state shared between callbacks - let is clearer than const wrapper
  /^let\s+storedCollections\s*=\s*null/, // pdf.js
  /^let\s+paypalToken(Expiry)?\s*=/, // server.js PayPal token cache
];

/**
 * Find all declarations of a keyword (let or var) in a file
 * Returns array of { line, lineNumber, column }
 */
const findDeclarations = (source, keyword) => {
  const results = [];
  const lines = source.split("\n");
  const regex = new RegExp(`\\b${keyword}\\s+`, "g");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Skip if in a comment
      const beforeMatch = line.substring(0, match.index);
      if (beforeMatch.includes("//")) continue;
      // Simple check for block comments (not perfect but catches most)
      if (beforeMatch.includes("/*") && !beforeMatch.includes("*/")) continue;

      results.push({
        line: line.trim(),
        lineNumber: i + 1,
        column: match.index + 1,
      });
    }
    regex.lastIndex = 0; // Reset regex for next line
  }

  return results;
};

const findLetDeclarations = (source) => findDeclarations(source, "let");
const findVarDeclarations = (source) => findDeclarations(source, "var");

/**
 * Check if a let declaration is allowed by our patterns
 */
const isAllowedLet = (line) => {
  const trimmed = line.trim();
  return ALLOWED_LET_PATTERNS.some((pattern) => pattern.test(trimmed));
};

/**
 * Analyze all JS files and find let usage
 */
const analyzeLetUsage = () => {
  const violations = [];
  const warnings = [];

  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES];
  for (const relativePath of allJsFiles) {
    // Skip allowed files entirely
    if (ALLOWED_LET_FILES.has(relativePath)) continue;

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const letDeclarations = findLetDeclarations(source);

    for (const decl of letDeclarations) {
      const entry = {
        file: relativePath,
        line: decl.lineNumber,
        code: decl.line,
      };

      if (isAllowedLet(decl.line)) {
        // Allowed patterns are fine, don't even warn
        continue;
      }

      // For now, everything else is a warning
      // Later we can move some to violations
      warnings.push(entry);
    }
  }

  return { violations, warnings };
};

/**
 * Analyze all JS files and find var usage
 * var is always a violation unless the file is whitelisted
 */
const analyzeVarUsage = () => {
  const violations = [];
  const allowed = [];

  // Exclude this test file since it contains var examples in test strings
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES]
    .filter((f) => f !== "test/let-usage.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const varDeclarations = findVarDeclarations(source);

    for (const decl of varDeclarations) {
      const entry = {
        file: relativePath,
        line: decl.lineNumber,
        code: decl.line,
      };

      if (ALLOWED_VAR_FILES.has(relativePath)) {
        allowed.push(entry);
      } else {
        violations.push(entry);
      }
    }
  }

  return { violations, allowed };
};

const testCases = [
  {
    name: "find-let-in-source",
    description: "Correctly identifies let declarations in source code",
    test: () => {
      const source = `
const a = 1;
let b = 2;
for (let i = 0; i < 10; i++) {}
// let comment = "ignored";
const c = "not a declaration";
let d, e, f;
      `;
      const results = findLetDeclarations(source);
      expectTrue(
        results.length === 3,
        `Expected 3 let declarations, found ${results.length}`
      );
    },
  },
  {
    name: "find-var-in-source",
    description: "Correctly identifies var declarations in source code",
    test: () => {
      const source = `
const a = 1;
var b = 2;
for (var i = 0; i < 10; i++) {}
// var comment = "ignored";
const c = "not a declaration";
var d, e, f;
      `;
      const results = findVarDeclarations(source);
      expectTrue(
        results.length === 3,
        `Expected 3 var declarations, found ${results.length}`
      );
    },
  },
  {
    name: "allowed-patterns-work",
    description: "Allowed patterns correctly match exempted let usage",
    test: () => {
      const allowedLines = [
        "let ELEMENTS = null;",
        "let gallery, currentImage, imagePopup;",
        "let storedCollections = null;",
      ];
      for (const line of allowedLines) {
        expectTrue(
          isAllowedLet(line),
          `Expected "${line}" to be allowed`
        );
      }

      const disallowedLines = [
        "let count = 0;",
        "let html = '';",
        "for (let i = 0; i < 10; i++) {}",
      ];
      for (const line of disallowedLines) {
        expectTrue(
          !isAllowedLet(line),
          `Expected "${line}" to NOT be allowed`
        );
      }
    },
  },
  {
    name: "check-let-usage-in-project",
    description: "Scans project files and reports let usage",
    test: () => {
      const { violations, warnings } = analyzeLetUsage();

      // Report warnings
      if (warnings.length > 0) {
        console.log(`\n  ⚠️  Found ${warnings.length} let declarations to review:`);
        for (const w of warnings) {
          console.log(`     - ${w.file}:${w.line}`);
          console.log(`       ${w.code}`);
        }
        console.log("");
      }

      // If enforcing, fail on any violations
      if (ENFORCE_NO_LET && violations.length > 0) {
        throw new Error(
          `Found ${violations.length} disallowed let declarations. ` +
          `Refactor to use const or add to allowed patterns if necessary.`
        );
      }

      // For now, just pass (warnings are informational)
      expectTrue(true, "Let usage scan completed");
    },
  },
  {
    name: "no-new-var-declarations",
    description: "No new var declarations outside whitelisted files",
    test: () => {
      const { violations, allowed } = analyzeVarUsage();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} non-whitelisted var declarations:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: refactor to use const/let, or add file to ALLOWED_VAR_FILES\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted var declarations. See list above.`
      );
    },
  },
  {
    name: "report-allowed-var-declarations",
    description: "Reports whitelisted var declarations for tracking",
    test: () => {
      const { allowed } = analyzeVarUsage();

      console.log(`\n  Whitelisted var declarations: ${allowed.length}`);
      console.log("  These should be refactored to const over time:\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of allowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(a.line);
      }

      for (const [file, lines] of Object.entries(byFile)) {
        console.log(`     ${file}: lines ${lines.join(", ")}`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported whitelisted var declarations");
    },
  },
];

createTestRunner("let-usage", testCases);
