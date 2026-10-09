/**
 * Detects references to unregistered Eleventy collections.
 *
 * This is the test-time counterpart to the build-time validation in
 * src/_lib/eleventy/validate-collections.js (which delegates to
 * buildRegisteredNames and findViolations internally). Both catch the
 * same issue: accessing `collections.foo` where "foo" is not registered.
 *
 * The build-time check runs during `npm run build`.
 * This test runs during `npm test` for faster feedback.
 */
import { describe, expect, test } from "vitest";
import {
  assertNoViolations,
  scanFilesForViolations,
} from "#test/code-scanner.js";
import { createExtractor, getFiles, SRC_HTML_FILES } from "#test/test-utils.js";
import { frozenSet } from "#utils/fp/set.js";

const DOT_ACCESS_SINGLE = /collections\.([a-zA-Z_][\w-]*)/;
const BRACKET_ACCESS_SINGLE = /collections\["([^"]+)"\]/;
const IGNORED_PROPERTIES = frozenSet(["size", "length"]);

describe("unregistered-collections", () => {
  const registeredNames = frozenSet([
    "all",
    ...createExtractor(/\.addCollection\(\s*"([^"]+)"/g)(
      getFiles(/^src\/.*\.js$/),
    ),
    ...createExtractor(/"?tags"?\s*:\s*\[\s*"([^"]+)"\s*\]/g)(
      getFiles(/^src\/.*\.(js|json)$/),
    ),
  ]);

  test("all template collection references are registered", () => {
    assertNoViolations(
      scanFilesForViolations(
        [...SRC_HTML_FILES(), ...getFiles(/^src\/.*\.liquid$/)],
        (line, lineNum, _source, filePath) => {
          const match =
            line.match(DOT_ACCESS_SINGLE) || line.match(BRACKET_ACCESS_SINGLE);

          if (!match) return null;

          const name = match[1];
          if (registeredNames.has(name) || IGNORED_PROPERTIES.has(name))
            return null;

          return {
            file: filePath,
            line: lineNum,
            code: `collections.${name} (not registered)`,
          };
        },
      ),
      {
        singular: "unregistered collection reference",
        fixHint:
          "Register the collection via addCollection() or check for typos",
      },
    );
  });

  test("registered names include expected collections", () => {
    const expected = ["news", "pages", "all", "navigationLinks"];

    for (const name of expected) {
      expect(registeredNames.has(name)).toBe(true);
    }
  });
});
