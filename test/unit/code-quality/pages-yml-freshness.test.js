import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir, withTempDir } from "#test/test-utils.js";
import { regenerateToTemp } from "#test/unit/code-quality/code-quality-utils.js";

const PAGES_YML_PATH = join(rootDir, ".pages.yml");
const GENERATOR_SCRIPT = join(
  rootDir,
  "scripts/customise-cms/generate-full.js",
);

/** Mirrors the BLOCKS_LAYOUT.md freshness test in block-docs.test.js: the
 *  committed .pages.yml must match what the full-config generator produces,
 *  so any change to BLOCK_CMS_FIELDS or the generator output shape forces a
 *  regeneration rather than silently drifting. Regenerates to a temp path so
 *  the committed file is never written mid-run. */
describe("pages-yml-freshness", () => {
  test(".pages.yml matches generator output", () =>
    withTempDir("pages-yml-freshness", (tempDir) => {
      const committed = readFileSync(PAGES_YML_PATH, "utf-8");
      const regenerated = regenerateToTemp(
        GENERATOR_SCRIPT,
        "PAGES_YML_OUTPUT_PATH",
        tempDir,
      );
      expect(regenerated).toBe(committed);
    }));
});
