import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestRunner, expectTrue, rootDir } from "#test/test-utils.js";

const dataDir = join(rootDir, "src/_data");

// Pre-compute list of JS data files
const DATA_JS_FILES = existsSync(dataDir)
  ? readdirSync(dataDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => ({ name: f, path: join(dataDir, f) }))
  : [];

/**
 * Check if a JS file has named exports alongside default export.
 * This breaks Eleventy data files because Eleventy exposes all exports
 * as properties of an object instead of just the default value.
 *
 * Valid patterns:
 *   - export default value;  (only default export)
 *   - array._helpers = {...}; export default array;  (helpers attached to value)
 *
 * Invalid patterns:
 *   - export const FOO = ...; export default ...; (named + default)
 *   - export { FOO }; export default ...; (re-export + default)
 */
const hasProblematicNamedExports = (content) => {
  // Check for named exports (export const, export function, export {, export let, export var)
  const namedExportPattern =
    /export\s+(const|let|var|function|class)\s+\w+|export\s*\{/;

  // Check for default export
  const defaultExportPattern = /export\s+default\b/;

  const hasNamedExport = namedExportPattern.test(content);
  const hasDefaultExport = defaultExportPattern.test(content);

  // Problem only occurs when BOTH exist
  return hasNamedExport && hasDefaultExport;
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
          "When Eleventy loads ES modules with named exports alongside default, " +
          "it exposes all exports as object properties instead of just the default value. " +
          "Use the _helpers pattern: attach helpers to the value before exporting default.",
      );
    },
  },
];

createTestRunner("data-exports", testCases);
