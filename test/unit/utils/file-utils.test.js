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
 * Scaffold a temp snippet dir, optionally write a snippet file,
 * create a configured mock, and run a callback inside a mocked CWD.
 * Cleans up the temp dir afterward.
 */
const withSnippetSetup = async (testName, snippetName, content, callback) => {
  const { tempDir, snippetsDir } = createTempSnippetsDir(testName);
  try {
    if (content !== null) {
      fs.writeFileSync(`${snippetsDir}/${snippetName}.md`, content);
    }
    await withMockedCwd(tempDir, async () => {
      await callback(createConfiguredMock());
    });
  } finally {
    cleanupTempDir(tempDir);
  }
};

const testSnippet = (testName, snippetName, content, callback) =>
  withSnippetSetup(testName, snippetName, content, async (mockConfig) => {
    const result = await mockConfig.asyncShortcodes.render_snippet(snippetName);
    await callback(result);
  });

const testSnippetData = (testName, snippetName, content, callback) =>
  withSnippetSetup(testName, snippetName, content, (mockConfig) => {
    callback(mockConfig.filters.snippet_data(snippetName));
  });

describe("file-utils", () => {
  describe("configureFileUtils", () => {
    test("Registers all expected filters and shortcodes", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);

      expect(typeof mockConfig.filters.file_exists).toBe("function");
      expect(typeof mockConfig.filters.file_missing).toBe("function");
      expect(typeof mockConfig.filters.snippet_data).toBe("function");
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

  describe("snippet_data filter", () => {
    test("Returns frontmatter data from snippet file", () => {
      const content = `---
title: Footer
blocks:
  - type: markdown
    content: Hello world
---
body content`;
      testSnippetData("snippet_data-basic", "footer", content, (data) => {
        expect(data.title).toBe("Footer");
        expect(Array.isArray(data.blocks)).toBe(true);
        expect(data.blocks.length).toBe(1);
        expect(data.blocks[0].type).toBe("markdown");
        expect(data.blocks[0].content).toBe("Hello world");
      });
    });

    test("Returns empty object for missing snippet", () => {
      testSnippetData("snippet_data-missing", "nonexistent", null, (data) => {
        expect(data).toEqual({});
      });
    });

    test("Returns empty object for snippet with no frontmatter", () => {
      testSnippetData(
        "snippet_data-no-frontmatter",
        "plain",
        "just some body text",
        (data) => {
          expect(data).toEqual({});
        },
      );
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

  describe("snippet_blocks_with_context filter", () => {
    const testSnippetBlocksCtx = (
      testName,
      snippetName,
      content,
      pageContext,
      callback,
    ) =>
      withSnippetSetup(testName, snippetName, content, async (mockConfig) => {
        const filter = mockConfig.asyncFilters.snippet_blocks_with_context;
        const result = await filter.call(
          { context: { environments: pageContext } },
          snippetName,
        );
        await callback(result);
      });

    test("Registers as an async filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);
      expect(typeof mockConfig.asyncFilters.snippet_blocks_with_context).toBe(
        "function",
      );
    });

    test("Returns empty array for missing snippet", async () => {
      await testSnippetBlocksCtx(
        "ctx-missing",
        "nonexistent",
        null,
        {},
        (result) => {
          expect(result).toEqual([]);
        },
      );
    });

    test("Resolves Liquid expressions in block strings with page context", async () => {
      const content = `---
name: Test CTA
blocks:
  - type: cta
    title: "Book your {{ title }}"
    description: Static description
---`;
      await testSnippetBlocksCtx(
        "ctx-liquid",
        "test-cta",
        content,
        { title: "Mini Gizmo" },
        (result) => {
          expect(result.length).toBe(1);
          expect(result[0].title).toBe("Book your Mini Gizmo");
          expect(result[0].description).toBe("Static description");
          expect(result[0].type).toBe("cta");
        },
      );
    });

    test("Resolves Liquid in nested block properties", async () => {
      const content = `---
name: Nested Test
blocks:
  - type: cta
    title: "{{ title }}"
    button:
      text: "Buy {{ title }}"
      href: /contact/
---`;
      await testSnippetBlocksCtx(
        "ctx-nested",
        "nested",
        content,
        { title: "Widget" },
        (result) => {
          expect(result[0].title).toBe("Widget");
          expect(result[0].button.text).toBe("Buy Widget");
          expect(result[0].button.href).toBe("/contact/");
        },
      );
    });

    test("Returns empty array for snippet without blocks", async () => {
      const content = `---
name: No blocks
---
Just body text`;
      await testSnippetBlocksCtx(
        "ctx-no-blocks",
        "no-blocks",
        content,
        {},
        (result) => {
          expect(result).toEqual([]);
        },
      );
    });

    test("Leaves plain strings unchanged", async () => {
      const content = `---
name: Plain
blocks:
  - type: cta
    title: No templates here
---`;
      await testSnippetBlocksCtx(
        "ctx-plain",
        "plain-cta",
        content,
        { title: "Unused" },
        (result) => {
          expect(result[0].title).toBe("No templates here");
        },
      );
    });

    test("Preserves non-string values in blocks", async () => {
      const content = `---
name: Mixed Types
blocks:
  - type: stats
    columns: 3
    items:
      - value: "{{ title }}"
        label: Name
---`;
      await testSnippetBlocksCtx(
        "ctx-mixed",
        "mixed",
        content,
        { title: "Gizmo" },
        (result) => {
          expect(result[0].columns).toBe(3);
          expect(result[0].items[0].value).toBe("Gizmo");
          expect(result[0].items[0].label).toBe("Name");
        },
      );
    });
  });
});
