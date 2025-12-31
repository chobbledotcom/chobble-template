import { createTestRunner, expectTrue, fs, path, rootDir, getFiles } from "./test-utils.js";

// Configuration
const MAX_WORDS = 4;
const PREFERRED_WORDS = 3;

// Pattern: JS files in src (excludes test files)
const SOURCE_JS_PATTERN = /^src\/.*\.js$/;

// External APIs we can't control (only those exceeding 4 words)
const IGNORED_IDENTIFIERS = new Set([
  // Eleventy plugin APIs
  "eleventyImageOnRequestDuringServePlugin", // 7 words
  "getNewestCollectionItemDate", // 5 words
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

  let match;
  while ((match = camelCasePattern.exec(noComments)) !== null) {
    identifiers.add(match[1]);
  }

  return Array.from(identifiers);
};

/**
 * Analyze the codebase for verbose camelCase names.
 * Returns an object with violations and their occurrence counts.
 */
const analyzeNamingConventions = () => {
  const jsFiles = getFiles(SOURCE_JS_PATTERN);
  const violations = {};

  for (const relativePath of jsFiles) {
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
const formatViolations = (violations) => {
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

// Run the analysis once for use in tests
const violations = analyzeNamingConventions();
const violationCount = Object.keys(violations).length;

// Log violations for visibility
if (violationCount > 0) {
  console.log("\n" + formatViolations(violations) + "\n");
}

const testCases = [
  {
    name: "count-words-simple",
    description: "countCamelCaseWords counts simple cases correctly",
    test: () => {
      expectTrue(countCamelCaseWords("get") === 1, "get = 1 word");
      expectTrue(countCamelCaseWords("getUser") === 2, "getUser = 2 words");
      expectTrue(
        countCamelCaseWords("getUserById") === 4,
        "getUserById = 4 words",
      );
      expectTrue(
        countCamelCaseWords("getActiveUserById") === 5,
        "getActiveUserById = 5 words",
      );
    },
  },
  {
    name: "count-words-acronyms",
    description: "countCamelCaseWords treats acronyms as single words",
    test: () => {
      // Acronyms count as one word
      expectTrue(
        countCamelCaseWords("parseURL") === 2,
        "parseURL = 2 words (parse+URL)",
      );
      expectTrue(
        countCamelCaseWords("fileURLToPath") === 4,
        "fileURLToPath = 4 words (file+URL+To+Path)",
      );
      expectTrue(
        countCamelCaseWords("innerHTML") === 2,
        "innerHTML = 2 words (inner+HTML)",
      );
      expectTrue(
        countCamelCaseWords("xmlHTTPRequest") === 3,
        "xmlHTTPRequest = 3 words (xml+HTTP+Request)",
      );
      // Single word
      expectTrue(countCamelCaseWords("parse") === 1, "parse = 1 word");
      expectTrue(countCamelCaseWords("URL") === 1, "URL = 1 word");
    },
  },
  {
    name: "extract-identifiers",
    description:
      "extractCamelCaseIdentifiers extracts camelCase names from source",
    test: () => {
      const source = `
        const userName = "test";
        function getUserById(id) {
          return someFunction();
        }
      `;
      const identifiers = extractCamelCaseIdentifiers(source);
      expectTrue(identifiers.includes("userName"), "Should find userName");
      expectTrue(
        identifiers.includes("getUserById"),
        "Should find getUserById",
      );
      expectTrue(
        identifiers.includes("someFunction"),
        "Should find someFunction",
      );
    },
  },
  {
    name: "ignore-strings",
    description:
      "extractCamelCaseIdentifiers ignores identifiers inside strings",
    test: () => {
      const source = `
        const msg = "getUserById is the function name";
        const func = regularName;
      `;
      const identifiers = extractCamelCaseIdentifiers(source);
      expectTrue(
        !identifiers.includes("getUserById"),
        "Should not find getUserById from string",
      );
      expectTrue(
        identifiers.includes("regularName"),
        "Should find regularName",
      );
    },
  },
  {
    name: "check-violations",
    description: `Check camelCase identifiers for verbosity (max ${MAX_WORDS} words)`,
    test: () => {
      if (violationCount > 0) {
        console.warn(
          `⚠️  Warning: ${violationCount} identifier(s) exceed ${MAX_WORDS} words. ` +
            `See list above.`,
        );
      }
    },
  },
];

createTestRunner("naming-conventions", testCases);
