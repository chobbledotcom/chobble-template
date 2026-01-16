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
      expect(typeof mockConfig.shortcodes.read_code).toBe("function");
    });
  });

  describe("file_exists filter", () => {
    test("Returns true for existing files", () => {
      withTempFile("file_exists", "test.txt", "test content", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.filters.file_exists("test.txt");
          expect(result).toBe(true);
        });
      });
    });

    test("Returns false for non-existing files", () => {
      withTempDir("file_exists-false", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.filters.file_exists("nonexistent.txt");
          expect(result).toBe(false);
        });
      });
    });
  });

  describe("file_missing filter", () => {
    test("Returns false for existing files", () => {
      withTempFile("file_missing", "test.txt", "test content", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.filters.file_missing("test.txt");
          expect(result).toBe(false);
        });
      });
    });

    test("Returns true for non-existing files", () => {
      withTempDir("file_missing-true", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.filters.file_missing("nonexistent.txt");
          expect(result).toBe(true);
        });
      });
    });
  });

  describe("escape_html filter", () => {
    test("Escapes HTML special characters", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);
      const escapeHtml = mockConfig.filters.escape_html;

      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
      expect(escapeHtml("a & b")).toBe("a &amp; b");
      expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
      expect(escapeHtml('<a href="test">link</a>')).toBe(
        "&lt;a href=&quot;test&quot;&gt;link&lt;/a&gt;",
      );
    });

    test("Handles empty string", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);

      expect(mockConfig.filters.escape_html("")).toBe("");
    });

    test("Leaves plain text unchanged", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);

      expect(mockConfig.filters.escape_html("Hello World")).toBe("Hello World");
    });
  });

  describe("read_file shortcode", () => {
    test("Reads content from existing file", () => {
      const content = "Hello, World!";
      withTempFile("read_file", "test.txt", content, (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.shortcodes.read_file("test.txt");
          expect(result).toBe(content);
        });
      });
    });

    test("Returns empty string for missing file", () => {
      withTempDir("read_file-missing", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.shortcodes.read_file("nonexistent.txt");
          expect(result).toBe("");
        });
      });
    });
  });

  describe("read_code shortcode", () => {
    test("Reads and escapes file content", () => {
      const htmlContent = "<div>Hello</div>";

      withTempFile("read_code", "test.html", htmlContent, (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.shortcodes.read_code("test.html");
          expect(result).toBe("&lt;div&gt;Hello&lt;/div&gt;");
        });
      });
    });

    test("Returns empty string for missing file", () => {
      withTempDir("read_code-missing", (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        withMockedCwd(tempDir, () => {
          const result = mockConfig.shortcodes.read_code("nonexistent.txt");
          expect(result).toBe("");
        });
      });
    });
  });

  describe("render_snippet shortcode", () => {
    test("Renders markdown from snippet file", async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir("render_snippet");
      const content = `---
title: Test
---
# Hello

World`;

      try {
        fs.writeFileSync(`${snippetsDir}/test.md`, content);

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("test");
          expect(result.includes("<h1>")).toBe(true);
          expect(result.includes("Hello")).toBe(true);
          // Frontmatter should be stripped
          expect(result.includes("title: Test")).toBe(false);
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test("Returns default string for missing snippet", async () => {
      withTempDir("render_snippet-missing", async (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

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
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render_snippet-html",
      );
      const content = `<div class="custom">Custom HTML</div>

Some **bold** text.`;

      try {
        fs.writeFileSync(`${snippetsDir}/html-test.md`, content);

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("html-test");
          expect(result.includes('<div class="custom">')).toBe(true);
          expect(result.includes("<strong>bold</strong>")).toBe(true);
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test("Preprocesses {% opening_times %} shortcode", async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render_snippet-opening",
      );
      const content = `# Our Hours

{% opening_times %}

Come visit us!`;

      try {
        fs.writeFileSync(`${snippetsDir}/hours.md`, content);

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("hours");
          expect(result.includes("<h1>")).toBe(true);
          expect(result.includes("Come visit us")).toBe(true);
          // The shortcode should be processed (replaced with actual content or empty)
          expect(result.includes("{% opening_times %}")).toBe(false);
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test("Preprocesses {% recurring_events %} shortcode", async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render_snippet-recurring",
      );
      const content = `# Regular Events

{% recurring_events %}

Join us weekly!`;

      try {
        fs.writeFileSync(`${snippetsDir}/events.md`, content);

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("events");
          expect(result.includes("<h1>")).toBe(true);
          expect(result.includes("Join us weekly")).toBe(true);
          // The shortcode should be processed
          expect(result.includes("{% recurring_events %}")).toBe(false);
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test("Handles empty snippet content", async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render_snippet-empty",
      );

      try {
        fs.writeFileSync(`${snippetsDir}/empty.md`, "");

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("empty");
          // Empty markdown renders to empty string
          expect(result.trim()).toBe("");
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test("Handles special characters in content", async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render_snippet-special",
      );
      const content = `# Special Characters

Unicode: café résumé naïve`;

      try {
        fs.writeFileSync(`${snippetsDir}/special.md`, content);

        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);

        await withMockedCwd(tempDir, async () => {
          const result =
            await mockConfig.asyncShortcodes.render_snippet("special");
          expect(result.includes("café")).toBe(true);
        });
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });
});
