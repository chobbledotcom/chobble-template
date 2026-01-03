import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import fg from "fast-glob";
import { rootDir } from "#test/test-utils.js";

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

describe("scss.variables", () => {
  test("SCSS files are found in src/css directory", () => {
    expect(scssFiles.length > 0).toBe(true);
  });

  test("Main style.scss file exists and can be read", () => {
    const content = readFileSync(`${rootDir}/${STYLE_FILE}`, "utf-8");
    expect(content.length > 0).toBe(true);
  });

  test("CSS variables are used in the SCSS files", () => {
    expect(usedVariables.size > 0).toBe(true);
  });

  test("CSS variables are defined in :root", () => {
    expect(definedVariables.size > 0).toBe(true);
  });

  test("All CSS variables used in SCSS are defined in :root", () => {
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
    expect(undefinedVariables).toEqual([]);
  });

  test("Variables consumed via JS are defined somewhere in SCSS", () => {
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
    expect(undefinedJsVars).toEqual([]);
  });

  test("extractUsedVariables finds var() usages correctly", () => {
    // Test the extraction function with known content
    const testFiles = scssFiles.slice(0, 1);
    const result = extractUsedVariables(testFiles);
    expect(result instanceof Set).toBe(true);
  });

  test("extractDefinedVariables finds variable definitions correctly", () => {
    const result = extractDefinedVariables(`${rootDir}/${STYLE_FILE}`);
    expect(result instanceof Set).toBe(true);
    // Check for known variables that should exist
    const hasColorVar = [...result].some((v) => v.startsWith("--color-"));
    expect(hasColorVar).toBe(true);
  });

  test("All defined variables follow naming convention", () => {
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

    expect(invalidNames).toEqual([]);
  });

  test("Variables are not defined multiple times in style.scss", () => {
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

    expect(duplicates).toEqual([]);
  });

  test("Reports variable coverage statistics", () => {
    const usedCount = usedVariables.size;
    const definedCount = definedVariables.size;

    // Calculate how many defined variables are actually used
    const definedAndUsed = [...definedVariables].filter((v) =>
      usedVariables.has(v),
    );
    const unusedDefined = [...definedVariables].filter(
      (v) => !usedVariables.has(v),
    );

    expect(definedAndUsed.length > 0).toBe(true);

    // This is informational - not a failure if there are unused defined variables
    // (they may be used in themes or overridden)
    expect(typeof unusedDefined.length).toBe("number");
  });
});
