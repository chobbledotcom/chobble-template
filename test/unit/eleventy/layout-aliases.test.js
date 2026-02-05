// Tests for layout-aliases.js
// Verifies Eleventy layout alias configuration from src/_layouts directory

import { describe, expect, test } from "bun:test";
import { configureLayoutAliases } from "#eleventy/layout-aliases.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  fs,
  path,
} from "#test/test-utils.js";

// ============================================
// Test Helper - Reduces Boilerplate
// ============================================

/**
 * Run configureLayoutAliases in a temp directory, returning captured aliases.
 * Handles cleanup automatically.
 */
const runLayoutAliases = (tempDir) => {
  const config = createMockEleventyConfig();
  const aliases = [];
  config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

  try {
    const srcDir = path.join(tempDir, "src");
    configureLayoutAliases(config, srcDir);
    return aliases;
  } finally {
    cleanupTempDir(tempDir);
  }
};

/**
 * Sets up a temp directory with layout files and runs the callback with aliases.
 * Handles cleanup automatically.
 */
const withTempLayouts = (files, callback) => {
  const tempDir = createTempDir("layout-aliases");
  const layoutsDir = path.join(tempDir, "src/_layouts");
  fs.mkdirSync(layoutsDir, { recursive: true });

  for (const file of files) {
    createTempFile(layoutsDir, file, "<html></html>");
  }

  return callback(runLayoutAliases(tempDir));
};

// ============================================
// Test Cases
// ============================================

describe("layout-aliases", () => {
  // --- Core Behavior: Counting ---
  test("Creates exactly one alias for each .html file found", () => {
    withTempLayouts(["a.html", "b.html", "c.html"], (aliases) => {
      expect(aliases).toHaveLength(3);
    });
  });

  // --- Core Behavior: Alias Naming ---
  test("Alias name is filename without .html extension", () => {
    withTempLayouts(["my-layout.html"], (aliases) => {
      expect(aliases[0].alias).toBe("my-layout");
    });
  });

  // --- Core Behavior: File Mapping ---
  test("File parameter includes .html extension", () => {
    withTempLayouts(["my-layout.html"], (aliases) => {
      expect(aliases[0].file).toBe("my-layout.html");
    });
  });

  // --- Filtering: Non-HTML Files ---
  test("Only processes files ending in .html", () => {
    const tempDir = createTempDir("layout-aliases-filter");
    const layoutsDir = path.join(tempDir, "src/_layouts");
    fs.mkdirSync(layoutsDir, { recursive: true });

    createTempFile(layoutsDir, "layout.html", "<html></html>");
    createTempFile(layoutsDir, "README.md", "# Layouts");
    createTempFile(layoutsDir, "config.json", "{}");
    createTempFile(layoutsDir, ".gitkeep", "");
    createTempFile(layoutsDir, "partial.liquid", "content");

    expect(runLayoutAliases(tempDir)).toHaveLength(1);
  });

  // --- Edge Case: Empty Directory ---
  test("No errors when directory has no HTML files", () => {
    const tempDir = createTempDir("layout-aliases-empty");
    const layoutsDir = path.join(tempDir, "src/_layouts");
    fs.mkdirSync(layoutsDir, { recursive: true });
    createTempFile(layoutsDir, ".gitkeep", "");

    expect(runLayoutAliases(tempDir)).toHaveLength(0);
  });

  // --- Edge Case: Hyphenated Filenames ---
  test("Hyphenated filenames produce hyphenated aliases", () => {
    withTempLayouts(["checkout-complete.html"], (aliases) => {
      expect(aliases[0].alias).toBe("checkout-complete");
    });
  });

  // --- Edge Case: Multi-Extension Files ---
  test("Only strips final .html extension from filenames", () => {
    withTempLayouts(["layout.backup.html"], (aliases) => {
      expect(aliases[0].alias).toBe("layout.backup");
    });
  });

  // --- Edge Case: Missing Directory ---
  test("Throws error when src/_layouts directory does not exist", () => {
    const tempDir = createTempDir("layout-aliases-missing");
    // Intentionally NOT creating src/_layouts

    try {
      const config = createMockEleventyConfig();
      config.addLayoutAlias = () => {
        // no-op: stub for layout alias registration
      };

      const srcDir = path.join(tempDir, "src");
      expect(() => configureLayoutAliases(config, srcDir)).toThrow(/ENOENT/);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  // --- Integration: Production Directory ---
  test("Successfully reads from actual src/_layouts directory", () => {
    const config = createMockEleventyConfig();
    const aliases = [];
    config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

    configureLayoutAliases(config);

    // Test behaviors, not specific files
    expect(aliases.length > 0).toBe(true);

    const allHaveAliases = aliases.every(
      (a) => typeof a.alias === "string" && a.alias.length > 0,
    );
    expect(allHaveAliases).toBe(true);

    const allHaveHtmlFiles = aliases.every((a) => a.file.endsWith(".html"));
    expect(allHaveHtmlFiles).toBe(true);

    const aliasesMatchFiles = aliases.every(
      (a) => a.file === `${a.alias}.html`,
    );
    expect(aliasesMatchFiles).toBe(true);
  });
});
