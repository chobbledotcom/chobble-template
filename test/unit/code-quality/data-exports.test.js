import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

const dataDir = join(rootDir, "src/_data");

const DATA_JS_FILES = existsSync(dataDir)
  ? readdirSync(dataDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => ({ name: f, path: join(dataDir, f) }))
  : [];

// Patterns for detecting export issues
const NAMED_EXPORT_PATTERN =
  /export\s+(const|let|var|function|class)\s+\w+|export\s*\{/;
const DEFAULT_EXPORT_PATTERN = /export\s+default\b/;
const HELPER_PATTERN = /\w+\.(\w+)\s*=\s*\{[^}]*\b(DEFAULT|select|get)\w*/;

describe("data-exports", () => {
  test("Data files should not mix named exports with default exports (breaks Eleventy)", () => {
    const problemFiles = [];

    for (const file of DATA_JS_FILES) {
      const content = readFileSync(file.path, "utf-8");
      // Check if file has both named and default exports (problematic)
      if (
        NAMED_EXPORT_PATTERN.test(content) &&
        DEFAULT_EXPORT_PATTERN.test(content)
      ) {
        problemFiles.push(file.name);
      }
    }

    expect(problemFiles.length).toBe(0);
  });

  test("Helper properties on data exports must be named '_helpers'", () => {
    const wrongNames = [];

    for (const file of DATA_JS_FILES) {
      const content = readFileSync(file.path, "utf-8");
      // Check if helpers are attached with wrong property name
      const match = content.match(HELPER_PATTERN);
      if (match && match[1] !== "_helpers") {
        wrongNames.push(
          `${file.name} uses '.${match[1]}' instead of '._helpers'`,
        );
      }
    }

    expect(wrongNames.length).toBe(0);
  });
});
