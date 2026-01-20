import { describe, expect, test } from "bun:test";
import strings from "#data/strings.js";
import baseStrings from "#data/strings-base.json" with { type: "json" };
import {
  createExtractor,
  expectObjectProps,
  srcDir,
} from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

// File extensions to ignore (from imports like "./strings.js")
const IGNORE_KEYS = frozenSet(["js", "json", "test", "mjs"]);

describe("strings", () => {
  test("Merged strings includes all keys from strings-base.json", () => {
    for (const key of Object.keys(baseStrings)) {
      expect(key in strings).toBe(true);
    }
  });

  test("Returns values from strings-base.json", () => {
    expectObjectProps({
      product_name: "Products",
      location_name: "Locations",
      event_name: "Events",
    })(strings);
  });

  test("Every strings.X usage in codebase has a default in strings-base.json", () => {
    const SOURCE_FILES = () => [
      ...new Bun.Glob("**/*.{html,md,js,mjs,liquid,njk}").scanSync({
        cwd: srcDir,
        absolute: true,
      }),
    ];

    const extractStringsKeys = createExtractor(/strings\.([a-z_]+)/g);
    const findStringsUsage = () =>
      [...extractStringsKeys(SOURCE_FILES())].filter(
        (k) => !IGNORE_KEYS.has(k),
      );
    const usedKeys = findStringsUsage();
    const missingKeys = usedKeys.filter((key) => !(key in baseStrings));

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing defaults in strings-base.json for: ${missingKeys.join(", ")}`,
      );
    }

    expect(usedKeys.length > 0).toBe(true);
  });
});
