import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir, withTempDir } from "#test/test-utils.js";
import { regenerateToTemp } from "#test/unit/code-quality/code-quality-utils.js";

const GENERATED_FILE = join(rootDir, "src/_lib/types/pages-cms-generated.d.ts");
const GENERATOR_SCRIPT = join(rootDir, "scripts/generate-pages-cms-types.js");

describe("type-generation-freshness", () => {
  test("pages-cms-generated.d.ts matches .pages.yml schema", () =>
    withTempDir("type-generation-freshness", (tempDir) => {
      const committed = readFileSync(GENERATED_FILE, "utf-8");
      const regenerated = regenerateToTemp(
        GENERATOR_SCRIPT,
        "PAGES_CMS_TYPES_OUTPUT_PATH",
        tempDir,
      );
      expect(regenerated).toBe(committed);
    }));
});
