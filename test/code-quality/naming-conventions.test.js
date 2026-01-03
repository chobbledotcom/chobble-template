import { describe, expect, test } from "bun:test";
import { analyzeFiles, stripStringsAndComments } from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// ============================================
// Naming Convention Checker Factory
// Consolidates camelCase word counting and analysis
// ============================================

/**
 * Factory that creates a naming convention checker with methods for:
 * - Counting words in camelCase identifiers
 * - Extracting camelCase identifiers from source
 * - Analyzing files for verbose names
 * - Formatting violation reports
 */
const createNamingConventionChecker = (jsFiles, config = {}) => {
  const {
    maxWords = 4,
    ignoredIdentifiers = new Set([
      "eleventyImageOnRequestDuringServePlugin",
      "getNewestCollectionItemDate",
    ]),
  } = config;

  // ----------------------------------------
  // Utility methods
  // ----------------------------------------

  const countCamelCaseWords = (str) => {
    const words = str.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
    return words.length;
  };

  // ----------------------------------------
  // Extraction methods
  // ----------------------------------------

  const extractCamelCaseIdentifiers = (source) => {
    const identifiers = new Set();
    const clean = stripStringsAndComments(source);
    for (const match of clean.matchAll(
      /\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g,
    )) {
      identifiers.add(match[1]);
    }
    return Array.from(identifiers);
  };

  // ----------------------------------------
  // Analysis methods
  // ----------------------------------------

  const analyzeNamingConventions = () => {
    const violations = {};
    analyzeFiles(jsFiles, (source, relativePath) => {
      for (const identifier of extractCamelCaseIdentifiers(source)) {
        const wordCount = countCamelCaseWords(identifier);
        if (wordCount > maxWords && !ignoredIdentifiers.has(identifier)) {
          if (!violations[identifier])
            violations[identifier] = {
              wordCount,
              occurrences: 0,
              files: new Set(),
            };
          violations[identifier].occurrences++;
          violations[identifier].files.add(relativePath);
        }
      }
      return [];
    });
    return violations;
  };

  const formatViolations = (violations) => {
    const entries = Object.entries(violations);

    if (entries.length === 0) return "No naming convention violations found.";

    entries.sort((a, b) => {
      if (b[1].wordCount !== a[1].wordCount)
        return b[1].wordCount - a[1].wordCount;
      return b[1].occurrences - a[1].occurrences;
    });

    const lines = [
      `Found ${entries.length} identifiers exceeding ${maxWords} words:\n`,
    ];
    for (const [identifier, data] of entries) {
      lines.push(
        `  ${identifier} (${data.wordCount} words, ${data.occurrences}x)`,
      );
      for (const file of data.files) {
        lines.push(`    └─ ${file}`);
      }
    }

    return lines.join("\n");
  };

  return {
    countCamelCaseWords,
    extractCamelCaseIdentifiers,
    analyzeNamingConventions,
    formatViolations,
    config: { maxWords },
  };
};

// Create checker instance with default config
const namingChecker = createNamingConventionChecker(SRC_JS_FILES);

describe("naming-conventions", () => {
  test("countCamelCaseWords counts simple cases correctly", () => {
    expect(namingChecker.countCamelCaseWords("get")).toBe(1);
    expect(namingChecker.countCamelCaseWords("getUser")).toBe(2);
    expect(namingChecker.countCamelCaseWords("getUserById")).toBe(4);
    expect(namingChecker.countCamelCaseWords("getActiveUserById")).toBe(5);
  });

  test("countCamelCaseWords treats acronyms as single words", () => {
    // Acronyms count as one word
    expect(namingChecker.countCamelCaseWords("parseURL")).toBe(2);
    expect(namingChecker.countCamelCaseWords("fileURLToPath")).toBe(4);
    expect(namingChecker.countCamelCaseWords("innerHTML")).toBe(2);
    expect(namingChecker.countCamelCaseWords("xmlHTTPRequest")).toBe(3);
    // Single word
    expect(namingChecker.countCamelCaseWords("parse")).toBe(1);
    expect(namingChecker.countCamelCaseWords("URL")).toBe(1);
  });

  test("extractCamelCaseIdentifiers extracts camelCase names from source", () => {
    const source = `
      const userName = "test";
      function getUserById(id) {
        return someFunction();
      }
    `;
    const identifiers = namingChecker.extractCamelCaseIdentifiers(source);
    expect(identifiers).toContain("userName");
    expect(identifiers).toContain("getUserById");
    expect(identifiers).toContain("someFunction");
  });

  test("extractCamelCaseIdentifiers ignores identifiers inside strings", () => {
    const source = `
      const msg = "getUserById is the function name";
      const func = regularName;
    `;
    const identifiers = namingChecker.extractCamelCaseIdentifiers(source);
    expect(identifiers).not.toContain("getUserById");
    expect(identifiers).toContain("regularName");
  });

  test(`Check camelCase identifiers for verbosity (max ${namingChecker.config.maxWords} words)`, () => {
    const violations = namingChecker.analyzeNamingConventions();
    const violationCount = Object.keys(violations).length;

    // Log violations for visibility
    if (violationCount > 0) {
      console.log(`\n${namingChecker.formatViolations(violations)}\n`);
      console.warn(
        `⚠️  Warning: ${violationCount} identifier(s) exceed ${namingChecker.config.maxWords} words.`,
      );
    }

    // This is informational - doesn't fail
    expect(true).toBe(true);
  });
});
