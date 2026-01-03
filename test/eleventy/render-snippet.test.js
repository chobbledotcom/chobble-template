import { describe, expect, test } from "bun:test";
import { renderSnippet } from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createFrontmatter,
  createTempSnippetsDir,
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

describe("render-snippet", () => {
  test("Renders empty snippet as empty markdown", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-empty",
    );

    try {
      fs.writeFileSync(`${snippetsDir}/empty.md`, "");

      const result = await renderSnippet("empty", "fallback", tempDir);

      // Empty markdown renders to empty paragraph or empty string
      expect(result.trim()).toBe("");
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Renders whitespace-only snippet correctly", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-whitespace",
    );

    try {
      fs.writeFileSync(`${snippetsDir}/whitespace.md`, "   \n\n   ");

      const result = await renderSnippet("whitespace", "fallback", tempDir);

      // Whitespace-only content should not produce meaningful HTML
      expect(result.includes("<p>")).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles frontmatter followed by trailing newline correctly", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-trailing",
    );

    try {
      const content = createFrontmatter({ title: "Test" }, "\n");
      fs.writeFileSync(`${snippetsDir}/trailing.md`, content);

      const result = await renderSnippet("trailing", "fallback", tempDir);

      expect(result.includes("title:")).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Renders various markdown features correctly", async () => {
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

      expect(result.includes("<h1>")).toBe(true);
      expect(result.includes("<strong>")).toBe(true);
      expect(result.includes("<em>")).toBe(true);
      expect(result.includes("<li>")).toBe(true);
      expect(result.includes("<a href=")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Passes through HTML when html option is enabled (default)", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-html",
    );

    try {
      const content = `<div class="custom">Custom HTML</div>

Regular paragraph.`;

      fs.writeFileSync(`${snippetsDir}/html.md`, content);

      const result = await renderSnippet("html", "fallback", tempDir);

      expect(result.includes('<div class="custom">')).toBe(true);
      expect(result.includes("<p>")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Preprocesses {% opening_times %} shortcode", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-opening",
    );

    try {
      const content = `# Our Hours

{% opening_times %}

Come visit us!`;

      fs.writeFileSync(`${snippetsDir}/hours.md`, content);

      const result = await renderSnippet("hours", "fallback", tempDir);

      expect(result.includes("<h1>")).toBe(true);
      expect(result.includes("Come visit us")).toBe(true);
      // The shortcode should be processed (replaced with actual content or empty)
      expect(result.includes("{% opening_times %}")).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Preprocesses {% recurring_events %} shortcode", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-recurring",
    );

    try {
      const content = `# Regular Events

{% recurring_events %}

Join us weekly!`;

      fs.writeFileSync(`${snippetsDir}/events.md`, content);

      const result = await renderSnippet("events", "fallback", tempDir);

      expect(result.includes("<h1>")).toBe(true);
      expect(result.includes("Join us weekly")).toBe(true);
      // The shortcode should be processed
      expect(result.includes("{% recurring_events %}")).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles both opening_times and recurring_events in one snippet", async () => {
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

      expect(result.includes("{% opening_times %}")).toBe(false);
      expect(result.includes("{% recurring_events %}")).toBe(false);
      expect(result.includes("<h1>")).toBe(true);
      expect(result.includes("<h2>")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns default string for non-existent snippet", async () => {
    const { tempDir } = createTempSnippetsDir("render-snippet-missing");

    try {
      const result = await renderSnippet(
        "nonexistent-snippet-12345",
        "Default fallback content",
        tempDir,
      );

      expect(result).toBe("Default fallback content");
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns empty string when snippet missing and no default", async () => {
    const { tempDir } = createTempSnippetsDir("render-snippet-no-default");

    try {
      const result = await renderSnippet(
        "nonexistent-snippet-67890",
        "",
        tempDir,
      );

      expect(result).toBe("");
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns consistent results (memoization test)", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "render-snippet-cache",
    );

    try {
      const content = `# Cached Content

This should be cached.`;

      fs.writeFileSync(`${snippetsDir}/cached.md`, content);

      const result1 = await renderSnippet("cached", "fallback", tempDir);
      const result2 = await renderSnippet("cached", "fallback", tempDir);

      expect(result1).toBe(result2);
      expect(result1.includes("<h1>")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles special characters in content", async () => {
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

      expect(result.includes("café")).toBe(true);
      expect(result.includes("double") || result.includes('"')).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
