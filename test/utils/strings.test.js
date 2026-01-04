import { describe, expect, test } from "bun:test";
import strings from "#data/strings.js";
import baseStrings from "#data/strings-base.json" with { type: "json" };
import { createExtractor, srcDir } from "#test/test-utils.js";

// File extensions to ignore (from imports like "./strings.js")
const IGNORE_KEYS = new Set(["js", "json", "test", "mjs"]);

// Source files to scan for strings.X usage
const SOURCE_FILES = () => [
  ...new Bun.Glob("**/*.{html,md,js,mjs,liquid,njk}").scanSync({
    cwd: srcDir,
    absolute: true,
  }),
];

/** Extract all strings.X keys from files */
const extractStringsKeys = createExtractor(/strings\.([a-z_]+)/g);

/** Find all strings.X usages, filtering out file extension keys */
const findStringsUsage = () =>
  [...extractStringsKeys(SOURCE_FILES())].filter((k) => !IGNORE_KEYS.has(k));

describe("strings", () => {
  test("Merged strings includes all keys from strings-base.json", () => {
    for (const key of Object.keys(baseStrings)) {
      expect(key in strings).toBe(true);
    }
  });

  test("Returns values from strings-base.json", () => {
    expect(strings.product_name).toBe("Products");
    expect(strings.location_name).toBe("Locations");
    expect(strings.event_name).toBe("Events");
  });

  test("Every strings.X usage in codebase has a default in strings-base.json", () => {
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
