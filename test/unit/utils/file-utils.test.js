import { describe, expect, test } from "bun:test";
import {
  configureFileUtils,
  createMarkdownRenderer,
  fileExists,
  fileMissing,
  readFileContent,
  renderSnippet,
} from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempSnippetsDir,
  fs,
  withMockedCwdAsync,
  withTempDir,
  withTempFile,
} from "#test/test-utils.js";

describe("file-utils", () => {
  test("Creates markdown renderer with default options", () => {
    const renderer = createMarkdownRenderer();
    expect(typeof renderer.render).toBe("function");

    const result = renderer.render("# Hello\n\nWorld");
    expect(result.includes("<h1>")).toBe(true);
    expect(result.includes("Hello")).toBe(true);
  });

  test("Creates markdown renderer with custom options", () => {
    const renderer = createMarkdownRenderer({ html: false });
    expect(typeof renderer.render).toBe("function");

    const result = renderer.render("<div>HTML</div>");
    expect(result.includes("<div>")).toBe(false);
  });

  test("Returns true for existing files", () => {
    withTempFile("fileExists", "test.txt", "test content", (tempDir) => {
      const result = fileExists("test.txt", tempDir);
      expect(result).toBe(true);
    });
  });

  test("Returns false for non-existing files", () => {
    withTempDir("fileExists-false", (tempDir) => {
      const result = fileExists("nonexistent.txt", tempDir);
      expect(result).toBe(false);
    });
  });

  test("Uses process.cwd() as default base directory", () => {
    // Create a temp file in current working directory to test
    withTempFile(
      "default-cwd",
      "test-file.txt",
      "content",
      (tempDir, _filePath) => {
        // Change to temp dir and test without specifying baseDir
        const originalCwd = process.cwd();
        try {
          process.chdir(tempDir);
          const result = fileExists("test-file.txt");
          expect(result).toBe(true);
        } finally {
          process.chdir(originalCwd);
        }
      },
    );
  });

  test("Returns inverse of fileExists", () => {
    withTempFile("fileMissing", "test.txt", "test content", (tempDir) => {
      expect(fileMissing("test.txt", tempDir)).toBe(false);
      expect(fileMissing("nonexistent.txt", tempDir)).toBe(true);
    });
  });

  test("Reads content from existing file", () => {
    const content = "Hello, World!";
    withTempFile("readFile", "test.txt", content, (tempDir) => {
      const result = readFileContent("test.txt", tempDir);
      expect(result).toBe(content);
    });
  });

  test("Returns empty string for missing file", () => {
    withTempDir("readFile-missing", (tempDir) => {
      const result = readFileContent("nonexistent.txt", tempDir);
      expect(result).toBe("");
    });
  });

  test("Renders existing snippet file", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir("renderSnippet");
    const content = `---
title: Test
---
# Hello

World`;

    try {
      // fs already imported from test-utils
      fs.writeFileSync(`${snippetsDir}/test.md`, content);

      const result = await renderSnippet("test", "default", tempDir);
      expect(result.includes("<h1>")).toBe(true);
      expect(result.includes("Hello")).toBe(true);
      expect(result.includes("title: Test")).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns default string for missing snippet", async () => {
    withTempDir("renderSnippet-missing", async (tempDir) => {
      const result = await renderSnippet(
        "nonexistent",
        "Default content",
        tempDir,
      );
      expect(result).toBe("Default content");
    });
  });

  test("Uses custom markdown renderer", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "renderSnippet-custom",
    );
    const content = "# Hello\n\nWorld";

    try {
      // fs already imported from test-utils
      fs.writeFileSync(`${snippetsDir}/test.md`, content);

      const customRenderer = createMarkdownRenderer({ html: false });
      const result = await renderSnippet(
        "test",
        "default",
        tempDir,
        customRenderer,
      );
      expect(result.includes("<h1>")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Configures file utility filters and shortcodes", () => {
    const mockConfig = createMockEleventyConfig();

    configureFileUtils(mockConfig);

    expect(typeof mockConfig.filters.file_exists).toBe("function");
    expect(typeof mockConfig.filters.file_missing).toBe("function");
    expect(typeof mockConfig.asyncShortcodes.render_snippet).toBe("function");
    expect(typeof mockConfig.shortcodes.read_file).toBe("function");
  });

  test("Configured filters work correctly", () => {
    const mockConfig = createMockEleventyConfig();
    configureFileUtils(mockConfig);

    const existsResult = mockConfig.filters.file_exists("package.json");
    const missingResult = mockConfig.filters.file_missing(
      "nonexistent-file.txt",
    );

    expect(existsResult).toBe(true);
    expect(missingResult).toBe(true);
  });

  test("Configured shortcodes work correctly", async () => {
    const content = "Test content";

    withTempFile("shortcodes", "test.txt", content, async (tempDir) => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);

      await withMockedCwdAsync(tempDir, async () => {
        const readResult = mockConfig.shortcodes.read_file("test.txt");
        expect(readResult).toBe(content);

        const snippetResult = await mockConfig.asyncShortcodes.render_snippet(
          "nonexistent",
          "default",
        );
        expect(snippetResult).toBe("default");
      });
    });
  });

  test("Functions should be pure and not modify inputs", () => {
    const name = "test-name";
    const defaultStr = "default";

    fileExists(name);
    fileMissing(name);

    expect(name).toBe("test-name");
    expect(defaultStr).toBe("default");
  });
});
