import { renderSnippet } from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createFrontmatter,
  createTempSnippetsDir,
  createTestRunner,
  expectFalse,
  expectStrictEqual,
  expectTrue,
  fs,
} from "#test/test-utils.js";

/**
 * Tests for renderSnippet function.
 *
 * Note: Basic renderSnippet functionality (frontmatter extraction, missing files,
 * custom renderers) is covered in file-utils.test.js. This file focuses on:
 * - Edge cases like empty content
 * - Shortcode preprocessing ({% opening_times %}, {% recurring_events %})
 */

const testCases = [
  {
    name: "renderSnippet-empty-content",
    description: "Renders empty snippet as empty markdown",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-empty",
      );

      try {
        fs.writeFileSync(`${snippetsDir}/empty.md`, "");

        const result = await renderSnippet("empty", "fallback", tempDir);

        // Empty markdown renders to empty paragraph or empty string
        expectStrictEqual(
          result.trim(),
          "",
          "Empty snippet should render empty",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-whitespace-only",
    description: "Renders whitespace-only snippet correctly",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-whitespace",
      );

      try {
        fs.writeFileSync(`${snippetsDir}/whitespace.md`, "   \n\n   ");

        const result = await renderSnippet("whitespace", "fallback", tempDir);

        // Whitespace-only content should not produce meaningful HTML
        expectFalse(
          result.includes("<p>"),
          "Whitespace-only should not produce paragraphs",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-frontmatter-with-trailing-newline",
    description: "Handles frontmatter followed by trailing newline correctly",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-trailing",
      );

      try {
        const content = createFrontmatter({ title: "Test" }, "\n");
        fs.writeFileSync(`${snippetsDir}/trailing.md`, content);

        const result = await renderSnippet("trailing", "fallback", tempDir);

        expectFalse(
          result.includes("title:"),
          "Should not include frontmatter",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-markdown-features",
    description: "Renders various markdown features correctly",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-features",
      );

      try {
        const content = `# Heading

**Bold** and *italic* text.

- List item 1
- List item 2

[A link](https://example.com)`;

        fs.writeFileSync(`${snippetsDir}/features.md`, content);

        const result = await renderSnippet("features", "fallback", tempDir);

        expectTrue(result.includes("<h1>"), "Should render heading");
        expectTrue(result.includes("<strong>"), "Should render bold");
        expectTrue(result.includes("<em>"), "Should render italic");
        expectTrue(result.includes("<li>"), "Should render list items");
        expectTrue(result.includes("<a href="), "Should render links");
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-html-passthrough",
    description: "Passes through HTML when html option is enabled (default)",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-html",
      );

      try {
        const content = `<div class="custom">Custom HTML</div>

Regular paragraph.`;

        fs.writeFileSync(`${snippetsDir}/html.md`, content);

        const result = await renderSnippet("html", "fallback", tempDir);

        expectTrue(
          result.includes('<div class="custom">'),
          "Should preserve HTML",
        );
        expectTrue(result.includes("<p>"), "Should render markdown paragraphs");
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-opening-times-shortcode",
    description: "Preprocesses {% opening_times %} shortcode",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-opening",
      );

      try {
        const content = `# Our Hours

{% opening_times %}

Come visit us!`;

        fs.writeFileSync(`${snippetsDir}/hours.md`, content);

        const result = await renderSnippet("hours", "fallback", tempDir);

        expectTrue(result.includes("<h1>"), "Should render heading");
        expectTrue(
          result.includes("Come visit us"),
          "Should render surrounding content",
        );
        // The shortcode should be processed (replaced with actual content or empty)
        expectFalse(
          result.includes("{% opening_times %}"),
          "Should not contain unprocessed shortcode",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-recurring-events-shortcode",
    description: "Preprocesses {% recurring_events %} shortcode",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-recurring",
      );

      try {
        const content = `# Regular Events

{% recurring_events %}

Join us weekly!`;

        fs.writeFileSync(`${snippetsDir}/events.md`, content);

        const result = await renderSnippet("events", "fallback", tempDir);

        expectTrue(result.includes("<h1>"), "Should render heading");
        expectTrue(
          result.includes("Join us weekly"),
          "Should render surrounding content",
        );
        // The shortcode should be processed
        expectFalse(
          result.includes("{% recurring_events %}"),
          "Should not contain unprocessed shortcode",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-both-shortcodes",
    description:
      "Handles both opening_times and recurring_events in one snippet",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-both",
      );

      try {
        const content = `# Schedule

## Opening Times
{% opening_times %}

## Regular Events
{% recurring_events %}`;

        fs.writeFileSync(`${snippetsDir}/schedule.md`, content);

        const result = await renderSnippet("schedule", "fallback", tempDir);

        expectFalse(
          result.includes("{% opening_times %}"),
          "Should process opening_times shortcode",
        );
        expectFalse(
          result.includes("{% recurring_events %}"),
          "Should process recurring_events shortcode",
        );
        expectTrue(result.includes("<h1>"), "Should render main heading");
        expectTrue(result.includes("<h2>"), "Should render subheadings");
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-missing-returns-default",
    description: "Returns default string for non-existent snippet",
    asyncTest: async () => {
      const { tempDir } = createTempSnippetsDir("render-snippet-missing");

      try {
        const result = await renderSnippet(
          "nonexistent-snippet-12345",
          "Default fallback content",
          tempDir,
        );

        expectStrictEqual(
          result,
          "Default fallback content",
          "Should return default string unchanged",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-missing-empty-default",
    description: "Returns empty string when snippet missing and no default",
    asyncTest: async () => {
      const { tempDir } = createTempSnippetsDir("render-snippet-no-default");

      try {
        const result = await renderSnippet(
          "nonexistent-snippet-67890",
          "",
          tempDir,
        );

        expectStrictEqual(
          result,
          "",
          "Should return empty string when no default",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-caching",
    description: "Returns consistent results (memoization test)",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-cache",
      );

      try {
        const content = `# Cached Content

This should be cached.`;

        fs.writeFileSync(`${snippetsDir}/cached.md`, content);

        const result1 = await renderSnippet("cached", "fallback", tempDir);
        const result2 = await renderSnippet("cached", "fallback", tempDir);

        expectStrictEqual(
          result1,
          result2,
          "Multiple calls should return identical results",
        );
        expectTrue(
          result1.includes("<h1>"),
          "Should contain rendered markdown",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "renderSnippet-special-characters",
    description: "Handles special characters in content",
    asyncTest: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir(
        "render-snippet-special",
      );

      try {
        const content = `# Special Characters

Quotes: "double" and 'single'
Ampersand: &
Less/greater: < >
Unicode: café résumé naïve`;

        fs.writeFileSync(`${snippetsDir}/special.md`, content);

        const result = await renderSnippet("special", "fallback", tempDir);

        expectTrue(result.includes("café"), "Should preserve unicode");
        expectTrue(
          result.includes("double") || result.includes('"'),
          "Should handle quotes",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
];

export default createTestRunner("render-snippet", testCases);
