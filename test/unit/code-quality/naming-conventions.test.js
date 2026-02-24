import { describe, expect, test } from "bun:test";
import { fs, path, rootDir, SRC_JS_FILES } from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

// Configuration
const MAX_WORDS = 4;
const _PREFERRED_WORDS = 3;

// External APIs we can't control (from libraries)
const IGNORED_IDENTIFIERS = frozenSet([
  "eleventyImageOnRequestDuringServePlugin", // Eleventy
  "getNewestCollectionItemDate", // Eleventy
  "disableJavaScriptFileLoading", // happy-dom settings
]);

/**
 * Count the number of "words" in a camelCase string.
 * A word is: initial lowercase segment, or capital followed by lowercase(s).
 * Acronyms (consecutive capitals like URL, DOM) count as ONE word.
 * e.g., "getUserById" = 4 words: get, User, By, Id
 * e.g., "parseURL" = 2 words: parse, URL
 * e.g., "fileURLToPath" = 4 words: file, URL, To, Path
 */
const countCamelCaseWords = (str) => {
  // Split on camelCase boundaries:
  // - between lowercase and uppercase: fileURL -> file|URL
  // - between acronym and next word: URLTo -> URL|To
  const words = str.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
  return words.length;
};

/**
 * Extract all camelCase identifiers from JavaScript source code.
 * Returns an array of identifiers.
 */
const extractCamelCaseIdentifiers = (source) => {
  const identifiers = new Set();

  // Remove string literals to avoid false positives
  const noStrings = source
    .replace(/'(?:[^'\\]|\\.)*'/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '""');

  // Remove comments
  const noComments = noStrings
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  // Match camelCase identifiers (starting with lowercase, having at least one uppercase)
  // This catches: variableNames, functionNames, methodNames
  const camelCasePattern = /\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g;

  for (const match of noComments.matchAll(camelCasePattern)) {
    identifiers.add(match[1]);
  }

  return Array.from(identifiers);
};

/**
 * Analyze the codebase for verbose camelCase names.
 * Returns an object with violations and their occurrence counts.
 */
const analyzeNamingConventions = () => {
  const violations = {};

  for (const relativePath of SRC_JS_FILES()) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const identifiers = extractCamelCaseIdentifiers(source);

    for (const identifier of identifiers) {
      const wordCount = countCamelCaseWords(identifier);

      if (wordCount > MAX_WORDS && !IGNORED_IDENTIFIERS.has(identifier)) {
        if (!violations[identifier]) {
          violations[identifier] = {
            wordCount,
            occurrences: 0,
            files: new Set(),
          };
        }
        violations[identifier].occurrences++;
        violations[identifier].files.add(relativePath);
      }
    }
  }

  return violations;
};

/**
 * Format violations for readable output.
 */
const formatNamingViolations = (violations) => {
  const entries = Object.entries(violations);

  if (entries.length === 0) {
    return "No naming convention violations found.";
  }

  // Sort by word count (descending), then by occurrences (descending)
  entries.sort((a, b) => {
    if (b[1].wordCount !== a[1].wordCount) {
      return b[1].wordCount - a[1].wordCount;
    }
    return b[1].occurrences - a[1].occurrences;
  });

  const lines = [
    `Found ${entries.length} identifiers exceeding ${MAX_WORDS} words:\n`,
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

describe("naming-conventions", () => {
  test("countCamelCaseWords counts simple cases correctly", () => {
    expect(countCamelCaseWords("get")).toBe(1);
    expect(countCamelCaseWords("getUser")).toBe(2);
    expect(countCamelCaseWords("getUserById")).toBe(4);
    expect(countCamelCaseWords("getActiveUserById")).toBe(5);
  });

  test("countCamelCaseWords treats acronyms as single words", () => {
    // Acronyms count as one word
    expect(countCamelCaseWords("parseURL")).toBe(2);
    expect(countCamelCaseWords("fileURLToPath")).toBe(4);
    expect(countCamelCaseWords("innerHTML")).toBe(2);
    expect(countCamelCaseWords("xmlHTTPRequest")).toBe(3);
    // Single word
    expect(countCamelCaseWords("parse")).toBe(1);
    expect(countCamelCaseWords("URL")).toBe(1);
  });

  test("extractCamelCaseIdentifiers extracts camelCase names from source", () => {
    const source = `
      const userName = "test";
      function getUserById(id) {
        return someFunction();
      }
    `;
    const identifiers = extractCamelCaseIdentifiers(source);
    expect(identifiers).toContain("userName");
    expect(identifiers).toContain("getUserById");
    expect(identifiers).toContain("someFunction");
  });

  test("extractCamelCaseIdentifiers ignores identifiers inside strings", () => {
    const source = `
      const msg = "getUserById is the function name";
      const func = regularName;
    `;
    const identifiers = extractCamelCaseIdentifiers(source);
    expect(identifiers).not.toContain("getUserById");
    expect(identifiers).toContain("regularName");
  });

  test(`No new long names (max ${MAX_WORDS} words)`, () => {
    const violations = analyzeNamingConventions();
    const violationCount = Object.keys(violations).length;

    if (violationCount > 0) {
      console.log(`\n${formatNamingViolations(violations)}\n`);
    }

    expect(violationCount).toBe(0);
  });
});
