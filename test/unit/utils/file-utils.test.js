import { describe, expect, test } from "bun:test";
import { configureFileUtils } from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempSnippetsDir,
  fs,
  withMockedCwd,
  withTempDir,
  withTempFile,
} from "#test/test-utils.js";

// ============================================
// Test Helpers to reduce duplication
// ============================================

/**
 * Create a configured file utils mock config.
 */
const createConfiguredMock = () => {
  const mockConfig = createMockEleventyConfig();
  configureFileUtils(mockConfig);
  return mockConfig;
};

/**
 * Run a test with configured file utils in a mocked CWD.
 */
const withFileUtils = (tempDir, callback) =>
  withMockedCwd(tempDir, () => callback(createConfiguredMock()));

/**
 * Run a sync test with a temp file and configured file utils.
 */
const testWithFile = (testName, filename, content, callback) =>
  withTempFile(testName, filename, content, (tempDir) =>
    withFileUtils(tempDir, callback),
  );

/**
 * Run a sync test with a temp dir (no file) and configured file utils.
 */
const testWithEmptyDir = (testName, callback) =>
  withTempDir(testName, (tempDir) => withFileUtils(tempDir, callback));

/**
 * Run an async snippet test with configured file utils.
 * Handles temp dir creation, snippet file creation, and cleanup.
 */
const testSnippet = async (testName, snippetName, content, callback) => {
  const { tempDir, snippetsDir } = createTempSnippetsDir(testName);
  try {
    fs.writeFileSync(`${snippetsDir}/${snippetName}.md`, content);
    const mockConfig = createConfiguredMock();
    await withMockedCwd(tempDir, async () => {
      const result =
        await mockConfig.asyncShortcodes.render_snippet(snippetName);
      await callback(result);
    });
  } finally {
    cleanupTempDir(tempDir);
  }
};

describe("file-utils", () => {
  describe("configureFileUtils", () => {
    test("Registers all expected filters and shortcodes", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);

      expect(typeof mockConfig.filters.file_exists).toBe("function");
      expect(typeof mockConfig.filters.file_missing).toBe("function");
      expect(typeof mockConfig.filters.escape_html).toBe("function");
      expect(typeof mockConfig.asyncShortcodes.render_snippet).toBe("function");
      expect(typeof mockConfig.shortcodes.read_file).toBe("function");
    });
  });

  describe("file_exists filter", () => {
    test("Returns true for existing files", () => {
      testWithFile("file_exists", "test.txt", "test content", (mockConfig) => {
        expect(mockConfig.filters.file_exists("test.txt")).toBe(true);
      });
    });

    test("Returns false for non-existing files", () => {
      testWithEmptyDir("file_exists-false", (mockConfig) => {
        expect(mockConfig.filters.file_exists("nonexistent.txt")).toBe(false);
      });
    });
  });

  describe("file_missing filter", () => {
    test("Returns false for existing files", () => {
      testWithFile("file_missing", "test.txt", "test content", (mockConfig) => {
        expect(mockConfig.filters.file_missing("test.txt")).toBe(false);
      });
    });

    test("Returns true for non-existing files", () => {
      testWithEmptyDir("file_missing-true", (mockConfig) => {
        expect(mockConfig.filters.file_missing("nonexistent.txt")).toBe(true);
      });
    });
  });

  describe("escape_html filter", () => {
    test("Escapes HTML special characters", () => {
      const { escape_html } = createConfiguredMock().filters;

      expect(escape_html("<div>")).toBe("&lt;div&gt;");
      expect(escape_html("a & b")).toBe("a &amp; b");
      expect(escape_html('"quoted"')).toBe("&quot;quoted&quot;");
      expect(escape_html('<a href="test">link</a>')).toBe(
        "&lt;a href=&quot;test&quot;&gt;link&lt;/a&gt;",
      );
    });

    test("Handles empty string", () => {
      const { escape_html } = createConfiguredMock().filters;
      expect(escape_html("")).toBe("");
    });

    test("Leaves plain text unchanged", () => {
      const { escape_html } = createConfiguredMock().filters;
      expect(escape_html("Hello World")).toBe("Hello World");
    });
  });

  describe("read_file shortcode", () => {
    test("Reads content from existing file", () => {
      const content = "Hello, World!";
      testWithFile("read_file", "test.txt", content, (mockConfig) => {
        expect(mockConfig.shortcodes.read_file("test.txt")).toBe(content);
      });
    });

    test("Returns empty string for missing file", () => {
      testWithEmptyDir("read_file-missing", (mockConfig) => {
        expect(mockConfig.shortcodes.read_file("nonexistent.txt")).toBe("");
      });
    });
  });

  describe("render_snippet shortcode", () => {
    test("Renders markdown from snippet file", async () => {
      const content = `---
title: Test
---
# Hello

World`;
      await testSnippet("render_snippet", "test", content, (result) => {
        expect(result.includes("<h1>")).toBe(true);
        expect(result.includes("Hello")).toBe(true);
        // Frontmatter should be stripped
        expect(result.includes("title: Test")).toBe(false);
      });
    });

    test("Returns default string for missing snippet", async () => {
      withTempDir("render_snippet-missing", async (tempDir) => {
        const mockConfig = createConfiguredMock();
        await withMockedCwd(tempDir, async () => {
          const result = await mockConfig.asyncShortcodes.render_snippet(
            "nonexistent",
            "Default content",
          );
          expect(result).toBe("Default content");
        });
      });
    });

    test("Renders HTML when markdown contains HTML", async () => {
      const content = `<div class="custom">Custom HTML</div>

Some **bold** text.`;
      await testSnippet(
        "render_snippet-html",
        "html-test",
        content,
        (result) => {
          expect(result.includes('<div class="custom">')).toBe(true);
          expect(result.includes("<strong>bold</strong>")).toBe(true);
        },
      );
    });

    test("Preprocesses {% opening_times %} shortcode", async () => {
      const content = `# Our Hours

{% opening_times %}

Come visit us!`;
      await testSnippet(
        "render_snippet-opening",
        "hours",
        content,
        (result) => {
          expect(result.includes("<h1>")).toBe(true);
          expect(result.includes("Come visit us")).toBe(true);
          // The shortcode should be processed (replaced with actual content or empty)
          expect(result.includes("{% opening_times %}")).toBe(false);
        },
      );
    });

    test("Preprocesses {% recurring_events %} shortcode", async () => {
      const content = `# Regular Events

{% recurring_events %}

Join us weekly!`;
      await testSnippet(
        "render_snippet-recurring",
        "events",
        content,
        (result) => {
          expect(result.includes("<h1>")).toBe(true);
          expect(result.includes("Join us weekly")).toBe(true);
          // The shortcode should be processed
          expect(result.includes("{% recurring_events %}")).toBe(false);
        },
      );
    });

    test("Handles empty snippet content", async () => {
      await testSnippet("render_snippet-empty", "empty", "", (result) => {
        // Empty markdown renders to empty string
        expect(result.trim()).toBe("");
      });
    });

    test("Handles special characters in content", async () => {
      const content = `# Special Characters

Unicode: café résumé naïve`;
      await testSnippet(
        "render_snippet-special",
        "special",
        content,
        (result) => {
          expect(result.includes("café")).toBe(true);
        },
      );
    });
  });
});
