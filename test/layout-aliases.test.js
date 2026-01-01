// Tests for layout-aliases.js
// Verifies Eleventy layout alias configuration from src/_layouts directory

import { configureLayoutAliases } from "#eleventy/layout-aliases.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  createTestRunner,
  expectStrictEqual,
  expectThrows,
  expectTrue,
  fs,
  path,
  withMockedCwd,
} from "#test/test-utils.js";

// ============================================
// Test Helper - Reduces Boilerplate
// ============================================

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

  const config = createMockEleventyConfig();
  const aliases = [];
  config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

  try {
    withMockedCwd(tempDir, () => configureLayoutAliases(config));
    return callback(aliases);
  } finally {
    cleanupTempDir(tempDir);
  }
};

// ============================================
// Test Cases
// ============================================

const testCases = [
  // --- Core Behavior: Counting ---
  {
    name: "registers-one-alias-per-html-file",
    description: "Creates exactly one alias for each .html file found",
    test: () => {
      withTempLayouts(["a.html", "b.html", "c.html"], (aliases) => {
        expectStrictEqual(
          aliases.length,
          3,
          "Should register one alias per HTML file",
        );
      });
    },
  },

  // --- Core Behavior: Alias Naming ---
  {
    name: "strips-html-extension-for-alias-name",
    description: "Alias name is filename without .html extension",
    test: () => {
      withTempLayouts(["my-layout.html"], (aliases) => {
        expectStrictEqual(
          aliases[0].alias,
          "my-layout",
          "Alias should be filename without .html extension",
        );
      });
    },
  },

  // --- Core Behavior: File Mapping ---
  {
    name: "preserves-full-filename-for-file-parameter",
    description: "File parameter includes .html extension",
    test: () => {
      withTempLayouts(["my-layout.html"], (aliases) => {
        expectStrictEqual(
          aliases[0].file,
          "my-layout.html",
          "File parameter should preserve full filename with extension",
        );
      });
    },
  },

  // --- Filtering: Non-HTML Files ---
  {
    name: "ignores-non-html-files",
    description: "Only processes files ending in .html",
    test: () => {
      const tempDir = createTempDir("layout-aliases-filter");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, "layout.html", "<html></html>");
      createTempFile(layoutsDir, "README.md", "# Layouts");
      createTempFile(layoutsDir, "config.json", "{}");
      createTempFile(layoutsDir, ".gitkeep", "");
      createTempFile(layoutsDir, "partial.liquid", "content");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

        withMockedCwd(tempDir, () => configureLayoutAliases(config));

        expectStrictEqual(
          aliases.length,
          1,
          "Should only register the one .html file, ignoring others",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },

  // --- Edge Case: Empty Directory ---
  {
    name: "handles-empty-directory-gracefully",
    description: "No errors when directory has no HTML files",
    test: () => {
      const tempDir = createTempDir("layout-aliases-empty");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });
      createTempFile(layoutsDir, ".gitkeep", "");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

        withMockedCwd(tempDir, () => configureLayoutAliases(config));

        expectStrictEqual(
          aliases.length,
          0,
          "Should register zero aliases when no HTML files exist",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },

  // --- Edge Case: Hyphenated Filenames ---
  {
    name: "preserves-hyphens-in-alias-names",
    description: "Hyphenated filenames produce hyphenated aliases",
    test: () => {
      withTempLayouts(["checkout-complete.html"], (aliases) => {
        expectStrictEqual(
          aliases[0].alias,
          "checkout-complete",
          "Should preserve hyphens in alias name",
        );
      });
    },
  },

  // --- Edge Case: Multi-Extension Files ---
  {
    name: "handles-multi-extension-filenames",
    description: "Only strips final .html extension from filenames",
    test: () => {
      withTempLayouts(["layout.backup.html"], (aliases) => {
        expectStrictEqual(
          aliases[0].alias,
          "layout.backup",
          "Should only strip .html, preserving other extensions",
        );
      });
    },
  },

  // --- Edge Case: Missing Directory ---
  {
    name: "throws-when-layouts-directory-missing",
    description: "Throws error when src/_layouts directory does not exist",
    test: () => {
      const tempDir = createTempDir("layout-aliases-missing");
      // Intentionally NOT creating src/_layouts

      const originalCwd = process.cwd;
      try {
        const config = createMockEleventyConfig();
        config.addLayoutAlias = () => {};

        // Manually mock CWD since withMockedCwd doesn't restore on throw
        process.cwd = () => tempDir;

        expectThrows(
          () => configureLayoutAliases(config),
          /ENOENT/,
          "Should throw ENOENT when layouts directory is missing",
        );
      } finally {
        process.cwd = originalCwd;
        cleanupTempDir(tempDir);
      }
    },
  },

  // --- Integration: Production Directory ---
  {
    name: "finds-layouts-in-production-directory",
    description: "Successfully reads from actual src/_layouts directory",
    test: () => {
      const config = createMockEleventyConfig();
      const aliases = [];
      config.addLayoutAlias = (alias, file) => aliases.push({ alias, file });

      configureLayoutAliases(config);

      // Test behaviors, not specific files
      expectTrue(
        aliases.length > 0,
        "Should find at least one layout in production directory",
      );

      const allHaveAliases = aliases.every(
        (a) => typeof a.alias === "string" && a.alias.length > 0,
      );
      expectTrue(allHaveAliases, "All aliases should be non-empty strings");

      const allHaveHtmlFiles = aliases.every((a) => a.file.endsWith(".html"));
      expectTrue(allHaveHtmlFiles, "All file parameters should end with .html");

      const aliasesMatchFiles = aliases.every(
        (a) => a.file === `${a.alias}.html`,
      );
      expectTrue(
        aliasesMatchFiles,
        "Each alias should match its file without .html extension",
      );
    },
  },
];

export default createTestRunner("layout-aliases", testCases);
