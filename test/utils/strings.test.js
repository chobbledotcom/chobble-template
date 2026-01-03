import { describe, test, expect } from "bun:test";
import fg from "fast-glob";
import strings from "#data/strings.js";
import baseStrings from "#data/strings-base.json" with { type: "json" };
import { fs, srcDir } from "#test/test-utils.js";

/**
 * Find all strings.X usages in the codebase using Node.js
 */
const findStringsUsage = () => {
  // File extensions to ignore (from imports like "./strings.js")
  const ignoreKeys = new Set(["js", "json", "test", "mjs"]);

  // Find all template/source files
  const files = fg.sync("**/*.{html,md,js,mjs,liquid,njk}", {
    cwd: srcDir,
    absolute: true,
  });

  const keys = new Set();
  const regex = /strings\.([a-z_]+)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    for (const match of content.matchAll(regex)) {
      const key = match[1];
      if (!ignoreKeys.has(key)) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys);
};

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
