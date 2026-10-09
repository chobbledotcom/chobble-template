import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { rootDir, withTempDir } from "#test/test-utils.js";
import { regenerateToTemp } from "#test/unit/code-quality/code-quality-utils.js";

const GENERATED_FILE = join(rootDir, "src/_lib/types/pages-cms-generated.d.ts");
const GENERATOR_SCRIPT = join(rootDir, "scripts/generate-pages-cms-types.js");

describe("type-generation-freshness", () => {
  test("pages-cms-generated.d.ts matches .pages.yml schema", async () => {
    await withTempDir("type-generation-freshness", (tempDir) => {
      const committed = readFileSync(GENERATED_FILE, "utf-8");
      const regenerated = regenerateToTemp(
        GENERATOR_SCRIPT,
        "PAGES_CMS_TYPES_OUTPUT_PATH",
        tempDir,
      );
      expect(
        regenerated,
        "pages-cms-generated.d.ts is stale: run npm run generate-references and re-stage it",
      ).toBe(committed);
    });
    // Spawns the generator in a subprocess; under the full suite's
    // parallel lanes that exceeds the default timeout
  }, 5000);
});
