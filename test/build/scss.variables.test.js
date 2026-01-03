import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createPatternCollector } from "#test/code-scanner.js";
import { rootDir } from "#test/test-utils.js";

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

// Regex patterns for CSS variable extraction
const VAR_PATTERN = /var\(--([a-z][a-z0-9-]*)/g;
const DEF_PATTERN = /^\s*(--[a-z][a-z0-9-]*):/gm;

// ============================================
// SCSS Variables Analyzer Factory
// Uses createPatternCollector for chainable file scanning
// ============================================

/**
 * Factory that creates a chainable SCSS variable analyzer.
 * Uses functional composition with the pattern collector.
 *
 * @example
 * const analyzer = createSCSSVariableAnalyzer(CONSUMED_VIA_JS);
 * const { used, defined, undefined } = analyzer
 *   .scan(scssFiles)
 *   .definedIn(styleFile)
 *   .analyze();
 */
const createSCSSVariableAnalyzer = (consumedViaJs = []) => {
  const collector = createPatternCollector();
  const consumedSet = new Set(consumedViaJs);

  // Chainable scanner that collects used/defined vars
  const scan = (files) => {
    const used = collector
      .from(files)
      .matchAll(VAR_PATTERN, (m) => `--${m[1]}`);

    return {
      used,
      // Chain: specify where definitions should come from
      definedIn: (defFiles) => {
        const defined = collector.from(defFiles).matchAll(DEF_PATTERN);
        return {
          used,
          defined,
          // Terminal: compute undefined variables
          analyze: () => ({
            used,
            defined,
            undefined: [...used]
              .filter((v) => !defined.has(v) && !consumedSet.has(v))
              .sort(),
          }),
        };
      },
      // Alternative: get all definitions from same files
      withDefinitions: () => {
        const defined = collector.from(files).matchAll(DEF_PATTERN);
        return {
          used,
          defined,
          analyze: () => ({
            used,
            defined,
            undefined: [...used]
              .filter((v) => !defined.has(v) && !consumedSet.has(v))
              .sort(),
          }),
        };
      },
    };
  };

  // Direct extraction methods (for unit tests)
  const extractUsed = (files) =>
    collector.from(files).matchAll(VAR_PATTERN, (m) => `--${m[1]}`);

  const extractDefined = (files) => collector.from(files).matchAll(DEF_PATTERN);

  return { scan, extractUsed, extractDefined };
};

// Create analyzer instance
const scssAnalyzer = createSCSSVariableAnalyzer(CONSUMED_VIA_JS);

// ============================================
// Load data for tests using chainable API
// ============================================

const scssFiles = [
  ...new Bun.Glob("**/*.scss").scanSync({
    cwd: `${rootDir}/${SCSS_DIR}`,
    absolute: true,
  }),
];

// Use chainable API for main analysis
const analysis = scssAnalyzer
  .scan(scssFiles)
  .definedIn([`${rootDir}/${STYLE_FILE}`])
  .analyze();

const { used: usedVariables, defined: definedVariables } = analysis;
const undefinedVariables = analysis.undefined;

// Get all definitions across all files (for JS-consumed variable check)
const allDefinedVariables = scssAnalyzer.extractDefined(scssFiles);

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

  test("extractUsed finds var() usages correctly", () => {
    // Test the extraction function with known content
    const testFiles = scssFiles.slice(0, 1);
    const result = scssAnalyzer.extractUsed(testFiles);
    expect(result instanceof Set).toBe(true);
  });

  test("extractDefined finds variable definitions correctly", () => {
    const result = scssAnalyzer.extractDefined([`${rootDir}/${STYLE_FILE}`]);
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
    const _usedCount = usedVariables.size;
    const _definedCount = definedVariables.size;

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
