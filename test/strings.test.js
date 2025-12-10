import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import strings from "../src/_data/strings.js";
import baseStrings from "../src/_data/strings-base.json" with { type: "json" };
import {
  createTestRunner,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "../src");

/**
 * Find all strings.X usages in the codebase using ripgrep
 */
const findStringsUsage = () => {
  // File extensions to ignore (from imports like "./strings.js")
  const ignoreKeys = new Set(["js", "json", "test", "mjs"]);

  try {
    const result = execSync(
      `rg -o "strings\\.[a-z_]+" "${srcDir}" --no-filename --no-line-number`,
      { encoding: "utf-8" },
    );
    const matches = result.trim().split("\n");
    const keys = new Set(
      matches
        .map((match) => {
          // Extract just the key after "strings."
          const m = match.match(/strings\.([a-z_]+)/);
          return m ? m[1] : null;
        })
        .filter((key) => key && !ignoreKeys.has(key)),
    );
    return Array.from(keys);
  } catch (e) {
    // rg returns exit code 1 if no matches found
    return [];
  }
};

createTestRunner("strings", [
  {
    name: "has-all-base-keys",
    description: "Merged strings includes all keys from strings-base.json",
    test: () => {
      for (const key of Object.keys(baseStrings)) {
        expectTrue(
          key in strings,
          `strings should have key "${key}" from base`,
        );
      }
    },
  },
  {
    name: "returns-base-values",
    description: "Returns values from strings-base.json",
    test: () => {
      expectStrictEqual(strings.product_name, "Products");
      expectStrictEqual(strings.location_name, "Locations");
      expectStrictEqual(strings.event_name, "Events");
    },
  },
  {
    name: "all-used-keys-have-defaults",
    description:
      "Every strings.X usage in codebase has a default in strings-base.json",
    test: () => {
      const usedKeys = findStringsUsage();
      const missingKeys = usedKeys.filter((key) => !(key in baseStrings));

      if (missingKeys.length > 0) {
        throw new Error(
          `Missing defaults in strings-base.json for: ${missingKeys.join(", ")}`,
        );
      }

      expectTrue(usedKeys.length > 0, "Should find some string usages");
    },
  },
]);
