// Design System CSS Scoping Test
// Ensures all design-system SCSS files have styles scoped to .design-system
// This prevents design-system styles from leaking to other pages

import { describe, expect, test } from "bun:test";
import { fs, getFiles, path, rootDir } from "#test/test-utils.js";

const { readFileSync } = fs;
const { join, basename } = path;

// Get all SCSS files in the design-system directory
const DESIGN_SYSTEM_SCSS_FILES = getFiles(
  /^src\/css\/design-system\/_[^/]+\.scss$/,
);

// Files that are allowed to have unscoped content
// _index.scss only contains @forward statements
const ALLOWED_UNSCOPED_FILES = ["_index.scss"];

/**
 * Check if a file contains unscoped CSS rules.
 * Unscoped rules are those that appear outside of .design-system { }
 *
 * @param {string} content - SCSS file content
 * @returns {string[]} - Array of unscoped selectors found
 */
const findUnscopedSelectors = (content) => {
  const unscopedSelectors = [];

  // Remove comments (both single-line and multi-line)
  const withoutComments = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove @use, @forward, @import statements
  const withoutImports = withoutComments
    .replace(/@(?:use|forward|import)\s+[^;]+;/g, "")
    .trim();

  // If file is empty after removing imports/comments, it's fine
  if (!withoutImports) {
    return unscopedSelectors;
  }

  // Check if the remaining content starts with .design-system {
  // and there's nothing significant before or after the closing brace
  const designSystemPattern = /^\s*\.design-system\s*\{[\s\S]*\}\s*$/;

  if (!designSystemPattern.test(withoutImports)) {
    // Find what selectors are at the top level
    // Look for patterns that indicate a CSS rule outside .design-system
    const lines = withoutImports.split("\n");
    let braceDepth = 0;
    let currentSelector = "";
    let inDesignSystem = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Track if we're inside .design-system
      if (trimmed.startsWith(".design-system")) {
        inDesignSystem = true;
      }

      // Count braces
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;

      // If at top level (braceDepth === 0) and this looks like a selector
      if (braceDepth === 0 && !inDesignSystem) {
        // Check for selectors: .class, #id, element, [attr], :pseudo, *
        const selectorMatch = trimmed.match(
          /^([.#]?[a-zA-Z_*][a-zA-Z0-9_-]*|\[[^\]]+\]|:[a-z-]+)/,
        );
        if (selectorMatch && !trimmed.startsWith("@")) {
          currentSelector = selectorMatch[1];
        }
      }

      braceDepth += openBraces - closeBraces;

      // If we just opened a brace and had a selector, it's unscoped
      if (currentSelector && openBraces > 0 && !inDesignSystem) {
        unscopedSelectors.push(currentSelector);
        currentSelector = "";
      }

      // Reset inDesignSystem when we close back to depth 0
      if (braceDepth === 0) {
        inDesignSystem = false;
      }
    }
  }

  return unscopedSelectors;
};

/**
 * Simplified check: does the file have .design-system wrapper?
 * @param {string} content - SCSS file content
 * @returns {boolean} - true if properly scoped
 */
const hasDesignSystemWrapper = (content) => {
  // Remove comments
  const withoutComments = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove @use, @forward, @import statements
  const withoutImports = withoutComments
    .replace(/@(?:use|forward|import)\s+[^;]+;/g, "")
    .trim();

  // Empty file after removing imports is fine
  if (!withoutImports) {
    return true;
  }

  // Check that the content starts with .design-system {
  // and the file ends with the closing brace of .design-system
  return /^\s*\.design-system\s*\{[\s\S]*\}\s*$/.test(withoutImports);
};

describe("design-system-scoping", () => {
  test("extracts unscoped selectors correctly", () => {
    const unscopedContent = `
      @use "../variables" as *;

      .btn {
        color: red;
      }

      .hero {
        display: flex;
      }
    `;

    const selectors = findUnscopedSelectors(unscopedContent);
    expect(selectors).toContain(".btn");
    expect(selectors).toContain(".hero");
  });

  test("accepts properly scoped content", () => {
    const scopedContent = `
      @use "../variables" as *;

      .design-system {
        .btn {
          color: red;
        }

        .hero {
          display: flex;
        }
      }
    `;

    expect(hasDesignSystemWrapper(scopedContent)).toBe(true);
  });

  test("rejects unscoped content", () => {
    const unscopedContent = `
      @use "../variables" as *;

      .btn {
        color: red;
      }
    `;

    expect(hasDesignSystemWrapper(unscopedContent)).toBe(false);
  });

  test("all design-system SCSS files are properly scoped", () => {
    const violations = [];

    for (const file of DESIGN_SYSTEM_SCSS_FILES) {
      const filename = basename(file);

      // Skip allowed files
      if (ALLOWED_UNSCOPED_FILES.includes(filename)) {
        continue;
      }

      const fullPath = join(rootDir, file);
      const content = readFileSync(fullPath, "utf-8");

      if (!hasDesignSystemWrapper(content)) {
        const unscopedSelectors = findUnscopedSelectors(content);
        violations.push({
          file,
          selectors: unscopedSelectors,
        });
      }
    }

    // Report findings
    console.log("\n  📊 Design System Scoping Analysis:");
    console.log(`     Files checked: ${DESIGN_SYSTEM_SCSS_FILES.length}`);
    console.log(`     Files skipped: ${ALLOWED_UNSCOPED_FILES.length}`);
    console.log(`     Violations found: ${violations.length}`);

    if (violations.length > 0) {
      console.log("\n  ⚠️  Files with unscoped styles:");
      for (const { file, selectors } of violations) {
        console.log(`     - ${file}`);
        if (selectors.length > 0) {
          console.log(`       Unscoped selectors: ${selectors.join(", ")}`);
        }
      }
      console.log(
        "\n  💡 All styles in design-system/ must be wrapped in .design-system { }",
      );
    }

    expect(violations).toEqual([]);
  });
});
