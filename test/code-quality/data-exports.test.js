import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestRunner, expectTrue, rootDir } from "#test/test-utils.js";

const dataDir = join(rootDir, "src/_data");

const DATA_JS_FILES = existsSync(dataDir)
  ? readdirSync(dataDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => ({ name: f, path: join(dataDir, f) }))
  : [];

/**
 * Check if a JS file has named exports alongside default export.
 * This breaks Eleventy data files because Eleventy exposes all exports
 * as properties of an object instead of just the default value.
 */
const hasProblematicNamedExports = (content) => {
  const namedExportPattern =
    /export\s+(const|let|var|function|class)\s+\w+|export\s*\{/;
  const defaultExportPattern = /export\s+default\b/;

  return namedExportPattern.test(content) && defaultExportPattern.test(content);
};

/**
 * Check if helpers are attached with wrong property name.
 * If attaching helpers, must use `._helpers` not other names.
 */
const hasWrongHelperName = (content) => {
  // Look for pattern like `value.something = {` where something isn't _helpers
  const helperPattern = /\w+\.(\w+)\s*=\s*\{[^}]*\b(DEFAULT|select|get)\w*/;
  const match = content.match(helperPattern);

  if (match && match[1] !== "_helpers") {
    return match[1];
  }
  return null;
};

const testCases = [
  {
    name: "no-mixed-exports-in-data-files",
    description:
      "Data files should not mix named exports with default exports (breaks Eleventy)",
    test: () => {
      const problemFiles = [];

      for (const file of DATA_JS_FILES) {
        const content = readFileSync(file.path, "utf-8");
        if (hasProblematicNamedExports(content)) {
          problemFiles.push(file.name);
        }
      }

      expectTrue(
        problemFiles.length === 0,
        `Data files with mixed exports found: ${problemFiles.join(", ")}. ` +
          "Use the _helpers pattern: attach helpers to the value before exporting default.",
      );
    },
  },
  {
    name: "helpers-use-correct-property-name",
    description: "Helper properties on data exports must be named '_helpers'",
    test: () => {
      const wrongNames = [];

      for (const file of DATA_JS_FILES) {
        const content = readFileSync(file.path, "utf-8");
        const wrongName = hasWrongHelperName(content);
        if (wrongName) {
          wrongNames.push(
            `${file.name} uses '.${wrongName}' instead of '._helpers'`,
          );
        }
      }

      expectTrue(
        wrongNames.length === 0,
        `Wrong helper property names: ${wrongNames.join("; ")}`,
      );
    },
  },
];

createTestRunner("data-exports", testCases);
