import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { rootDir, withTempDir } from "#test/test-utils.js";
import { regenerateToTemp } from "#test/unit/code-quality/code-quality-utils.js";

const PAGES_YML_PATH = join(rootDir, ".pages.yml");
const GENERATOR_SCRIPT = join(
  rootDir,
  "scripts/customise-cms/generate-full.js",
);

/** The committed .pages.yml must match the cms_config saved in site.json, so
 *  per-site customization and schema changes cannot silently drift. Generates
 *  to a temp path so the committed file is never written mid-run. */
describe("pages-yml-freshness", () => {
  test(".pages.yml matches generator output", () =>
    withTempDir("pages-yml-freshness", (tempDir) => {
      const committed = readFileSync(PAGES_YML_PATH, "utf-8");
      const regenerated = regenerateToTemp(
        GENERATOR_SCRIPT,
        "PAGES_YML_OUTPUT_PATH",
        tempDir,
      );
      expect(
        regenerated,
        ".pages.yml is stale: run npm run generate-references and re-stage it",
      ).toBe(committed);
    }));
});
