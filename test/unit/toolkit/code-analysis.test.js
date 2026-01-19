/**
 * Tests for js-toolkit code-analysis utilities
 */
import { describe, expect, test } from "bun:test";
import { createTempFile, withTempDir } from "#test/test-utils.js";
import { createExtractor } from "#toolkit/test-utils/code-analysis.js";

describe("createExtractor", () => {
  test("extracts matches from a single file", () => {
    withTempDir("extract-single", (tempDir) => {
      const content = `
        import { foo } from "bar";
        import { baz } from "qux";
      `;
      createTempFile(tempDir, "test.js", content);

      const extractImports = createExtractor(/import\s*\{([^}]+)\}/g, (m) =>
        m[1].trim(),
      );
      const results = extractImports(["test.js"], tempDir);

      expect(results).toBeInstanceOf(Set);
      expect([...results]).toContain("foo");
      expect([...results]).toContain("baz");
    });
  });

  test("extracts from multiple files", () => {
    withTempDir("extract-multi", (tempDir) => {
      createTempFile(tempDir, "a.js", 'const FOO = "foo";');
      createTempFile(tempDir, "b.js", 'const BAR = "bar";');

      const extractConsts = createExtractor(/const\s+(\w+)/g);
      const results = extractConsts(["a.js", "b.js"], tempDir);

      expect([...results]).toContain("FOO");
      expect([...results]).toContain("BAR");
    });
  });

  test("uses default transform (m => m[1]) when not provided", () => {
    withTempDir("extract-default", (tempDir) => {
      createTempFile(
        tempDir,
        "test.js",
        "function hello() {} function world() {}",
      );

      const extractFunctions = createExtractor(/function\s+(\w+)/g);
      const results = extractFunctions(["test.js"], tempDir);

      expect([...results]).toEqual(["hello", "world"]);
    });
  });

  test("handles single file path (not array)", () => {
    withTempDir("extract-single-path", (tempDir) => {
      createTempFile(tempDir, "test.js", "let x = 1; let y = 2;");

      const extractLets = createExtractor(/let\s+(\w+)/g);
      const results = extractLets("test.js", tempDir);

      expect([...results]).toContain("x");
      expect([...results]).toContain("y");
    });
  });

  test("returns empty set when no matches", () => {
    withTempDir("extract-empty", (tempDir) => {
      createTempFile(tempDir, "test.js", "// no matches here");

      const extractImports = createExtractor(/import\s+(\w+)/g);
      const results = extractImports(["test.js"], tempDir);

      expect(results.size).toBe(0);
    });
  });

  test("deduplicates matches via Set", () => {
    withTempDir("extract-dedup", (tempDir) => {
      createTempFile(
        tempDir,
        "test.js",
        "const x = 1; const x = 2; const x = 3;",
      );

      const extractConsts = createExtractor(/const\s+(\w+)/g);
      const results = extractConsts(["test.js"], tempDir);

      expect([...results]).toEqual(["x"]);
    });
  });
});
