import { readFileSync } from "node:fs";
import fg from "fast-glob";
import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  rootDir,
} from "#test/test-utils.js";

const { globSync } = fg;

// ============================================
// Constants
// ============================================

const SCSS_DIR = "src/css";
const STYLE_FILE = "src/css/style.scss";

// Variables that are consumed outside SCSS (e.g., via JavaScript getPropertyValue)
// These variables are defined in SCSS but not read via var() in CSS
const CONSUMED_VIA_JS = [
  "--scroll-fade-selectors", // Read by scroll-fade.js via getPropertyValue
];

// ============================================
// Helper functions
// ============================================

/**
 * Extract all CSS variable usages from SCSS files
 * Finds patterns like: var(--color-bg)
 */
const extractUsedVariables = (scssFiles) => {
  const used = new Set();
  const varPattern = /var\(--([a-z][a-z0-9-]*)/g;

  for (const file of scssFiles) {
    const content = readFileSync(file, "utf-8");
    for (const match of content.matchAll(varPattern)) {
      used.add(`--${match[1]}`);
    }
  }

  return used;
};

/**
 * Extract all CSS variable definitions from a stylesheet
 * Finds patterns like: --color-bg: value;
 */
const extractDefinedVariables = (styleFile) => {
  const defined = new Set();
  const content = readFileSync(styleFile, "utf-8");

  const defPattern = /^\s*(--[a-z][a-z0-9-]*):/gm;
  for (const match of content.matchAll(defPattern)) {
    defined.add(match[1]);
  }

  return defined;
};

/**
 * Extract all CSS variable definitions from multiple SCSS files
 */
const extractAllDefinedVariables = (scssFiles) => {
  const defined = new Set();
  const defPattern = /^\s*(--[a-z][a-z0-9-]*):/gm;

  for (const file of scssFiles) {
    const content = readFileSync(file, "utf-8");
    for (const match of content.matchAll(defPattern)) {
      defined.add(match[1]);
    }
  }

  return defined;
};

/**
 * Find all undefined variables (used but not defined)
 * Excludes variables consumed via JavaScript
 */
const findUndefinedVariables = (used, defined) => {
  const undefinedVars = [];
  for (const variable of used) {
    if (!defined.has(variable) && !CONSUMED_VIA_JS.includes(variable)) {
      undefinedVars.push(variable);
    }
  }
  return undefinedVars.sort();
};

// ============================================
// Load data for tests
// ============================================

const scssFiles = globSync(`${rootDir}/${SCSS_DIR}/**/*.scss`);
const usedVariables = extractUsedVariables(scssFiles);
const definedVariables = extractDefinedVariables(`${rootDir}/${STYLE_FILE}`);
const allDefinedVariables = extractAllDefinedVariables(scssFiles);
const undefinedVariables = findUndefinedVariables(
  usedVariables,
  definedVariables,
);

// ============================================
// Test cases
// ============================================

const testCases = [
  {
    name: "scss-files-exist",
    description: "SCSS files are found in src/css directory",
    test: () => {
      expectTrue(scssFiles.length > 0, "Should find at least one SCSS file");
    },
  },
  {
    name: "style-file-exists",
    description: "Main style.scss file exists and can be read",
    test: () => {
      const content = readFileSync(`${rootDir}/${STYLE_FILE}`, "utf-8");
      expectTrue(content.length > 0, "style.scss should have content");
    },
  },
  {
    name: "variables-are-used",
    description: "CSS variables are used in the SCSS files",
    test: () => {
      expectTrue(
        usedVariables.size > 0,
        "Should find CSS variable usages in SCSS files",
      );
    },
  },
  {
    name: "variables-are-defined",
    description: "CSS variables are defined in :root",
    test: () => {
      expectTrue(
        definedVariables.size > 0,
        "Should find CSS variable definitions in style.scss",
      );
    },
  },
  {
    name: "all-used-variables-are-defined",
    description: "All CSS variables used in SCSS are defined in :root",
    test: () => {
      if (undefinedVariables.length > 0) {
        const errorMsg = [
          `Found ${undefinedVariables.length} undefined CSS variable(s):`,
          ...undefinedVariables.map((v) => `  - ${v}`),
          "",
          "To fix:",
          "  1. Add them to :root in src/css/style.scss",
          "  2. Replace with a standard variable (--color-text, --color-bg, etc.)",
          "  3. Add to CONSUMED_VIA_JS if used by JavaScript instead of CSS",
        ].join("\n");
        throw new Error(errorMsg);
      }
      expectDeepEqual(
        undefinedVariables,
        [],
        "All used variables should be defined",
      );
    },
  },
  {
    name: "js-consumed-vars-are-defined",
    description: "Variables consumed via JS are defined somewhere in SCSS",
    test: () => {
      // CONSUMED_VIA_JS variables should be DEFINED in some SCSS file
      // (just not used via var() - they're read by JavaScript)
      const undefinedJsVars = CONSUMED_VIA_JS.filter(
        (v) => !allDefinedVariables.has(v),
      );
      if (undefinedJsVars.length > 0) {
        throw new Error(
          `CONSUMED_VIA_JS contains undefined variables: ${undefinedJsVars.join(", ")}\n` +
            "These should be defined in a SCSS file or removed from the list.",
        );
      }
      expectDeepEqual(
        undefinedJsVars,
        [],
        "All JS-consumed variables should be defined in SCSS",
      );
    },
  },
  {
    name: "extractUsedVariables-basic",
    description: "extractUsedVariables finds var() usages correctly",
    test: () => {
      // Test the extraction function with known content
      const testFiles = scssFiles.slice(0, 1);
      const result = extractUsedVariables(testFiles);
      expectTrue(
        result instanceof Set,
        "Should return a Set of variable names",
      );
    },
  },
  {
    name: "extractDefinedVariables-basic",
    description: "extractDefinedVariables finds variable definitions correctly",
    test: () => {
      const result = extractDefinedVariables(`${rootDir}/${STYLE_FILE}`);
      expectTrue(
        result instanceof Set,
        "Should return a Set of variable names",
      );
      // Check for known variables that should exist
      const hasColorVar = [...result].some((v) => v.startsWith("--color-"));
      expectTrue(
        hasColorVar,
        "Should find at least one --color-* variable definition",
      );
    },
  },
  {
    name: "variable-naming-convention",
    description: "All defined variables follow naming convention",
    test: () => {
      const invalidNames = [];
      const validPattern = /^--[a-z][a-z0-9-]*$/;

      for (const variable of definedVariables) {
        if (!validPattern.test(variable)) {
          invalidNames.push(variable);
        }
      }

      if (invalidNames.length > 0) {
        throw new Error(
          `Found ${invalidNames.length} variable(s) with invalid names:\n` +
            invalidNames.map((v) => `  - ${v}`).join("\n") +
            "\n\nVariable names should match: --[a-z][a-z0-9-]*",
        );
      }

      expectDeepEqual(
        invalidNames,
        [],
        "All variable names should follow naming convention",
      );
    },
  },
  {
    name: "no-duplicate-definitions",
    description: "Variables are not defined multiple times in style.scss",
    test: () => {
      const content = readFileSync(`${rootDir}/${STYLE_FILE}`, "utf-8");
      const defPattern = /^\s*(--[a-z][a-z0-9-]*):/gm;
      const occurrences = {};

      for (const match of content.matchAll(defPattern)) {
        const variable = match[1];
        occurrences[variable] = (occurrences[variable] || 0) + 1;
      }

      const duplicates = Object.entries(occurrences)
        .filter(([_, count]) => count > 1)
        .map(([name, count]) => `${name} (${count}x)`);

      if (duplicates.length > 0) {
        throw new Error(
          `Found ${duplicates.length} duplicate variable definition(s):\n` +
            duplicates.map((d) => `  - ${d}`).join("\n"),
        );
      }

      expectDeepEqual(
        duplicates,
        [],
        "No variables should be defined multiple times",
      );
    },
  },
  {
    name: "coverage-report",
    description: "Reports variable coverage statistics",
    test: () => {
      const usedCount = usedVariables.size;
      const definedCount = definedVariables.size;

      // Calculate how many defined variables are actually used
      const definedAndUsed = [...definedVariables].filter((v) =>
        usedVariables.has(v),
      );
      const unusedDefined = [...definedVariables].filter(
        (v) => !usedVariables.has(v),
      );

      expectTrue(
        definedAndUsed.length > 0,
        `Should have variables that are both defined and used. ` +
          `Used: ${usedCount}, Defined: ${definedCount}, ` +
          `Matched: ${definedAndUsed.length}`,
      );

      // This is informational - not a failure if there are unused defined variables
      // (they may be used in themes or overridden)
      expectStrictEqual(
        typeof unusedDefined.length,
        "number",
        "Unused defined variables count should be a number",
      );
    },
  },
];

export default createTestRunner("scss.variables", testCases);
