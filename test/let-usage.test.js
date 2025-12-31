import { createTestRunner, expectTrue, fs, path, rootDir, SRC_JS_FILES } from "./test-utils.js";

// Set to true once all lets are removed to enforce const-only style
const ENFORCE_NO_LET = false;

// Files that are allowed to use let (third-party, legacy, or special cases)
const ALLOWED_FILES = new Set([
  "src/assets/js/autosizes.js", // Third-party polyfill
]);

// Specific let usages that are intentionally allowed
// Format: "filename:lineNumber" or patterns that are acceptable
const ALLOWED_PATTERNS = [
  // Module-level state that must be mutable
  /^let\s+(ELEMENTS|PREVIOUS_GLOBAL_VARS)\s*=\s*null/, // theme-editor.js state
  /^let\s+(gallery|currentImage|imagePopup)\s*[,;=]/, // gallery.js DOM refs
  /^let\s+currentPopupIndex\s*=/, // gallery.js state
];

/**
 * Find all let declarations in a file
 * Returns array of { line, lineNumber, column }
 */
const findLetDeclarations = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match 'let' as a keyword (not part of another word)
    // Handles: let x, let x =, for (let, etc.
    const regex = /\blet\s+/g;
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
  }

  return results;
};

/**
 * Check if a let declaration is allowed by our patterns
 */
const isAllowedLet = (line) => {
  const trimmed = line.trim();
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(trimmed));
};

/**
 * Analyze all JS files and find let usage
 */
const analyzeLetUsage = () => {
  const violations = [];
  const warnings = [];

  for (const relativePath of SRC_JS_FILES) {
    // Skip allowed files entirely
    if (ALLOWED_FILES.has(relativePath)) continue;

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
    name: "allowed-patterns-work",
    description: "Allowed patterns correctly match exempted let usage",
    test: () => {
      const allowedLines = [
        "let ELEMENTS = null;",
        "let gallery, currentImage, imagePopup;",
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
];

createTestRunner("let-usage", testCases);
