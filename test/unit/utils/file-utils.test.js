import { describe, expect, test } from "vitest";
import { configureFileUtils, ensureDir } from "#eleventy/file-utils.js";
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

      expect(typeof mockConfig.filters.snippet_data).toBe("function");
      expect(typeof mockConfig.filters.markdown).toBe("function");
      expect(typeof mockConfig.asyncShortcodes.render_snippet).toBe("function");
    });
  });

  describe("markdown filter", () => {
    test("Renders markdown to HTML", () => {
      const { markdown } = createConfiguredMock().filters;
      expect(markdown("# Heading")).toContain("<h1>Heading</h1>");
      expect(markdown("**bold**")).toContain("<strong>bold</strong>");
      expect(markdown("[link](https://example.com)")).toContain(
        '<a href="https://example.com">link</a>',
      );
    });

    test("Returns empty string for falsy input", () => {
      const { markdown } = createConfiguredMock().filters;
      expect(markdown("")).toBe("");
      expect(markdown(null)).toBe("");
      expect(markdown(undefined)).toBe("");
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

    test("A traversal name cannot escape src/snippets", () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "snippet_data-traversal",
      );
      try {
        // The "sensitive" file exists beside src/ with a matching basename;
        // only src/snippets/secret.md may ever be read.
        fs.writeFileSync(`${tempDir}/secret.md`, "---\ntitle: Secret\n---\n");
        fs.writeFileSync(
          `${snippetsDir}/secret.md`,
          "---\ntitle: Snippet\n---\n",
        );
        withMockedCwd(tempDir, () => {
          const mockConfig = createConfiguredMock();
          for (const name of [
            "../../secret",
            "../secret",
            "sub/../../secret",
            "/etc/cron.d/secret",
          ]) {
            expect(mockConfig.filters.snippet_data(name)).toEqual({
              title: "Snippet",
            });
          }
        });
      } finally {
        cleanupTempDir(tempDir);
      }
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

    test("Handles empty snippet content", async () => {
      await testSnippet("render_snippet-empty", "empty", "", (result) => {
        // Empty markdown renders to empty string
        expect(result.trim()).toBe("");
      });
    });

    test("Strips ++ underline markers from content", async () => {
      const content = "This is ++underlined++ text.";
      await testSnippet(
        "render_snippet-underline",
        "underline-test",
        content,
        (result) => {
          expect(result.includes("underlined")).toBe(true);
          expect(result.includes("<ins>")).toBe(false);
          expect(result.includes("++")).toBe(false);
        },
      );
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

  describe("snippets in the page language", () => {
    const snippet = (heading) =>
      `---\nblocks:\n  - type: markdown\n    content: "${heading}"\n---\n# ${heading}\n`;

    /** A shared footer snippet and a Spanish one, under a mocked CWD. */
    const withLocalisedSnippets = async (testName, callback) => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(testName);
      try {
        fs.writeFileSync(`${snippetsDir}/footer.md`, snippet("Shared"));
        fs.mkdirSync(`${snippetsDir}/es`);
        fs.writeFileSync(`${snippetsDir}/es/footer.md`, snippet("Español"));
        await withMockedCwd(tempDir, () => callback(createConfiguredMock()));
      } finally {
        cleanupTempDir(tempDir);
      }
    };

    test("A page reads its language's own version of a snippet", () =>
      withLocalisedSnippets(
        "snippets-localised",
        async ({ filters, asyncShortcodes }) => {
          expect(filters.snippet_data("footer", "es").blocks[0].content).toBe(
            "Español",
          );
          expect(filters.snippet_blocks("footer", "es")[0].content).toBe(
            "Español",
          );
          expect(
            await asyncShortcodes.render_snippet("footer", "", "es"),
          ).toContain("<h1>Español</h1>");
        },
      ));

    test("Falls back to the shared snippet for a language without one", () =>
      withLocalisedSnippets(
        "snippets-fallback",
        async ({ filters, asyncShortcodes }) => {
          expect(filters.snippet_data("footer", "de").blocks[0].content).toBe(
            "Shared",
          );
          expect(filters.snippet_blocks("footer").at(0).content).toBe("Shared");
          expect(
            await asyncShortcodes.render_snippet("footer", "", "de"),
          ).toContain("<h1>Shared</h1>");
        },
      ));
  });

  describe("snippet_blocks filter", () => {
    const testSnippetBlocks = (testName, snippetName, content, callback) =>
      withSnippetSetup(testName, snippetName, content, (mockConfig) =>
        callback(() => mockConfig.filters.snippet_blocks(snippetName)),
      );

    test("Throws for a snippet that does not exist", () =>
      testSnippetBlocks("blocks-missing", "nonexistent", null, (run) => {
        expect(run).toThrow(
          'Snippet block references "nonexistent", but src/snippets/ has no such snippet',
        );
      }));

    test("Resolves a snippet path saved by Pages CMS", async () => {
      const content = `---
name: CMS Snippet
blocks:
  - type: markdown
    content: CMS content
---`;

      await withSnippetSetup(
        "blocks-cms-path",
        "cms-snippet",
        content,
        (mockConfig) => {
          expect(
            mockConfig.filters.snippet_blocks("src/snippets/cms-snippet.md"),
          ).toEqual([
            { type: "markdown", content: "CMS content", dark: false },
          ]);
        },
      );
    });

    test("Fills schema defaults like page blocks, leaving Liquid for blocks.html", () =>
      testSnippetBlocks(
        "blocks-defaults",
        "cta",
        `---
name: CTA
blocks:
  - type: cta
    content: "Book your {{ title }}"
    button:
      text: Book
      href: /contact/
---`,
        (run) => {
          expect(run()).toEqual([
            {
              type: "cta",
              content: "Book your {{ title }}",
              button: {
                text: "Book",
                href: "/contact/",
                variant: "secondary",
                size: "lg",
              },
              dark: false,
            },
          ]);
        },
      ));

    test("Throws for an invalid block, naming the snippet", () =>
      testSnippetBlocks(
        "blocks-invalid",
        "bad",
        `---
name: Bad
blocks:
  - type: cta
    title: Not a cta field
---`,
        (run) => {
          expect(run).toThrow(
            /unknown keys: "title" \(block 1 in snippet "bad"\)/,
          );
        },
      ));

    test("Returns empty array for snippet without blocks", () =>
      testSnippetBlocks(
        "blocks-no-blocks",
        "no-blocks",
        `---
name: No blocks
---
Just body text`,
        (run) => {
          expect(run()).toEqual([]);
        },
      ));
  });

  describe("sidebar_blocks filter", () => {
    // Runs the filter against a temp snippet with a page context; the
    // callback receives a runner so tests can also assert throws.
    const testSidebarBlocksCtx = (
      testName,
      snippetName,
      content,
      pageContext,
      callback,
    ) =>
      withSnippetSetup(testName, snippetName, content, async (mockConfig) => {
        await callback(() =>
          mockConfig.asyncFilters.sidebar_blocks.call(
            { context: { environments: pageContext } },
            snippetName,
          ),
        );
      });

    test("Registers as an async filter", () => {
      const mockConfig = createConfiguredMock();
      expect(typeof mockConfig.asyncFilters.sidebar_blocks).toBe("function");
    });

    test("Returns empty array for missing snippet", async () => {
      await testSidebarBlocksCtx(
        "sidebar-missing",
        "sidebar-nonexistent",
        null,
        {},
        async (run) => {
          expect(await run()).toEqual([]);
        },
      );
    });

    test("Resolves Liquid in column-safe blocks with page context", async () => {
      const content = `---
name: Sidebar
blocks:
  - type: cta
    content: "Contact {{ title }}"
---`;
      await testSidebarBlocksCtx(
        "sidebar-safe",
        "sidebar-safe",
        content,
        { title: "Us" },
        async (run) => {
          expect(await run()).toEqual([
            { type: "cta", content: "Contact Us", dark: false },
          ]);
        },
      );
    });

    test("Throws for a column-disallowed block type", async () => {
      const content = `---
name: Sidebar
blocks:
  - type: hero
    content: Nope
---`;
      await testSidebarBlocksCtx(
        "sidebar-disallowed",
        "sidebar-disallowed",
        content,
        {},
        async (run) => {
          await expect(run()).rejects.toThrow(
            'Block type "hero" is not supported inside the right-content sidebar.',
          );
        },
      );
    });
  });

  describe("render_block_liquid filter", () => {
    const callRenderBlockLiquid = (blocks, pageContext) => {
      const mockConfig = createConfiguredMock();
      const filter = mockConfig.asyncFilters.render_block_liquid;
      return filter.call({ context: { environments: pageContext } }, blocks);
    };

    test("Registers as an async filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);
      expect(typeof mockConfig.asyncFilters.render_block_liquid).toBe(
        "function",
      );
    });

    test("Returns empty array for null/undefined blocks", async () => {
      expect(await callRenderBlockLiquid(null, {})).toEqual([]);
      expect(await callRenderBlockLiquid(undefined, {})).toEqual([]);
    });

    test("Resolves Liquid expressions in block strings with page context", async () => {
      const blocks = [
        { type: "markdown", content: "Visit [us]({{ site.url }})" },
      ];
      const result = await callRenderBlockLiquid(blocks, {
        site: { url: "https://example.com" },
      });
      expect(result[0].content).toBe("Visit [us](https://example.com)");
      expect(result[0].type).toBe("markdown");
    });

    test("Leaves strings without Liquid syntax unchanged", async () => {
      const blocks = [{ type: "markdown", content: "No templates here" }];
      const result = await callRenderBlockLiquid(blocks, { title: "Unused" });
      expect(result[0].content).toBe("No templates here");
    });

    test("Resolves Liquid inside list items and nested objects, keeping other values", async () => {
      const blocks = [
        {
          type: "stats",
          reveal: false,
          items: [{ value: "{{ title }}", label: "Name" }, "{{ title }}|Pipe"],
        },
      ];
      const [result] = await callRenderBlockLiquid(blocks, { title: "Gizmo" });
      expect(result).toEqual({
        type: "stats",
        reveal: false,
        items: [{ value: "Gizmo", label: "Name" }, "Gizmo|Pipe"],
      });
    });
  });

  describe("ensureDir", () => {
    test("creates a missing nested directory and returns its path", () =>
      withTempDir("ensureDir-nested", (tempDir) => {
        // A nested path with missing parents: only a recursive mkdir of a
        // genuinely-absent directory makes this pass — which pins the guard,
        // the mkdir call, and `recursive: true` all at once.
        const nested = `${tempDir}/a/b/c`;
        expect(fs.existsSync(nested)).toBe(false);

        const returned = ensureDir(nested);

        expect(fs.existsSync(nested)).toBe(true);
        expect(returned).toBe(nested);
      }));
  });
});
