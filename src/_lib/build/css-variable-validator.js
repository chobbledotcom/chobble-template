import path from "node:path";
import { filter, map, pipe, sort } from "#utils/fp/array.js";
import { frozenSetFrom, setLacks } from "#utils/fp/set.js";
import { compareStringKeys } from "#utils/fp/sorting.js";

const DEFINITION_PATTERN = /(--[a-z][a-z0-9-]*):/g;
const USAGE_PATTERN = /var\(--([a-z][a-z0-9-]*)/g;

/**
 * Validate that all var(--name) references in compiled CSS have definitions.
 * @param {string} css
 * @param {string} inputPath
 */
const validateCssVariables = (css, inputPath) => {
  /**
   * @param {RegExp} pattern
   * @param {(match: RegExpMatchArray) => string} mapFn
   * @returns {ReadonlySet<string>}
   */
  const toSet = (pattern, mapFn) =>
    frozenSetFrom(Array.from(css.matchAll(pattern), mapFn));

  const definitions = toSet(DEFINITION_PATTERN, (m) => m[1]);
  const usages = toSet(USAGE_PATTERN, (m) => `--${m[1]}`);

  const isUndefined = setLacks(definitions);

  const undefinedVars = pipe(
    filter(isUndefined),
    sort(compareStringKeys),
  )([...usages]);

  if (undefinedVars.length > 0) {
    throw new Error(
      [
        `SCSS build error: ${undefinedVars.length} undefined CSS variable(s) in ${path.basename(inputPath)}:`,
        ...pipe(map((v) => `  - ${v}`))(undefinedVars),
        "",
        "To fix:",
        "  1. Add the variable to :root in the appropriate SCSS file",
        "  2. Replace with an existing variable",
        "  3. Remove the var() reference",
      ].join("\n"),
    );
  }
};

export { validateCssVariables };
