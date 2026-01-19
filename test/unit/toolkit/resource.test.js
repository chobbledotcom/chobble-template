/**
 * Tests for js-toolkit resource utilities
 */

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { withTempFile } from "#toolkit/test-utils/resource.js";

describe("withTempFile", () => {
  test("creates a temp file with content and cleans up after callback", () => {
    let capturedPath = null;
    let capturedDir = null;

    withTempFile(
      "test-temp-file",
      "test.txt",
      "hello world",
      (tempDir, filePath) => {
        capturedDir = tempDir;
        capturedPath = filePath;

        // File should exist with content
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("hello world");
      },
    );

    // After callback, temp directory should be cleaned up
    expect(fs.existsSync(capturedDir)).toBe(false);
    expect(fs.existsSync(capturedPath)).toBe(false);
  });

  test("provides correct file path", () => {
    withTempFile(
      "test-path",
      "nested.txt",
      "nested content",
      (tempDir, filePath) => {
        expect(filePath.endsWith("nested.txt")).toBe(true);
        expect(filePath.startsWith(tempDir)).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("nested content");
      },
    );
  });

  test("passes return value from callback through", () => {
    const result = withTempFile(
      "test-return",
      "return.txt",
      "content",
      (_tempDir, filePath) => `processed: ${filePath}`,
    );

    expect(result.startsWith("processed:")).toBe(true);
  });
});
