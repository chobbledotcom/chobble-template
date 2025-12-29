import { createTestRunner, expectTrue, fs, path } from "./test-utils.js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Configuration
const MAX_WORDS = 4;
const PREFERRED_WORDS = 3;

// External APIs and built-ins we can't control
const IGNORED_IDENTIFIERS = new Set([
  // Node.js APIs
  "fileURLToPath",
  "encodeURIComponent",
  "decodeURIComponent",
  "toISOString",
  // Browser DOM APIs
  "innerHTML",
  "outerHTML",
  "createObjectURL",
  "revokeObjectURL",
  // External library APIs (Eleventy)
  "eleventyImageOnRequestDuringServePlugin",
  "getNewestCollectionItemDate",
]);

/**
 * Count the number of "words" in a camelCase string.
 * Words are segments separated by capital letters.
 * e.g., "getUserById" = 4 words: get, User, By, Id
 */
const countCamelCaseWords = (str) => {
  // Match lowercase start + subsequent capitalized segments
  const words = str.match(/^[a-z]+|[A-Z][a-z]*/g);
  return words ? words.length : 0;
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
 * Recursively get all JavaScript files from a directory.
 * Skips test files since they can have verbose names for clarity.
 */
const getJsFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, _site, test, and hidden directories
      if (
        !file.startsWith(".") &&
        file !== "node_modules" &&
        file !== "_site" &&
        file !== "test"
      ) {
        getJsFiles(filePath, fileList);
      }
    } else if (file.endsWith(".js")) {
      fileList.push(filePath);
    }
  }

  return fileList;
};

/**
 * Analyze the codebase for verbose camelCase names.
 * Returns an object with violations and their occurrence counts.
 */
const analyzeNamingConventions = () => {
  const jsFiles = getJsFiles(rootDir);
  const violations = {};

  for (const filePath of jsFiles) {
    const source = fs.readFileSync(filePath, "utf-8");
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
        violations[identifier].files.add(
          path.relative(rootDir, filePath)
        );
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
      `  ${identifier} (${data.wordCount} words, ${data.occurrences}x)`
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
      expectTrue(countCamelCaseWords("getUserById") === 4, "getUserById = 4 words");
      expectTrue(countCamelCaseWords("getActiveUserById") === 5, "getActiveUserById = 5 words");
    },
  },
  {
    name: "count-words-edge-cases",
    description: "countCamelCaseWords handles edge cases",
    test: () => {
      // Acronyms at end count as one word each letter
      expectTrue(countCamelCaseWords("parseURL") === 4, "parseURL = 4 words (parse+U+R+L)");
      expectTrue(countCamelCaseWords("fileURLToPath") === 6, "fileURLToPath = 6 words");
      // Single word
      expectTrue(countCamelCaseWords("parse") === 1, "parse = 1 word");
    },
  },
  {
    name: "extract-identifiers",
    description: "extractCamelCaseIdentifiers extracts camelCase names from source",
    test: () => {
      const source = `
        const userName = "test";
        function getUserById(id) {
          return someFunction();
        }
      `;
      const identifiers = extractCamelCaseIdentifiers(source);
      expectTrue(identifiers.includes("userName"), "Should find userName");
      expectTrue(identifiers.includes("getUserById"), "Should find getUserById");
      expectTrue(identifiers.includes("someFunction"), "Should find someFunction");
    },
  },
  {
    name: "ignore-strings",
    description: "extractCamelCaseIdentifiers ignores identifiers inside strings",
    test: () => {
      const source = `
        const msg = "getUserById is the function name";
        const func = regularName;
      `;
      const identifiers = extractCamelCaseIdentifiers(source);
      expectTrue(!identifiers.includes("getUserById"), "Should not find getUserById from string");
      expectTrue(identifiers.includes("regularName"), "Should find regularName");
    },
  },
  {
    name: "no-violations",
    description: `All camelCase identifiers have ${MAX_WORDS} or fewer words`,
    test: () => {
      if (violationCount > 0) {
        throw new Error(
          `Found ${violationCount} identifier(s) exceeding ${MAX_WORDS} words. ` +
          `See output above for details.`
        );
      }
    },
  },
];

createTestRunner("naming-conventions", testCases);
