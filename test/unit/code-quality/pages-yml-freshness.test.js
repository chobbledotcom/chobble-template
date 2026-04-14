import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

const PAGES_YML_PATH = join(rootDir, ".pages.yml");
const GENERATOR_SCRIPT = join(
  rootDir,
  "scripts/customise-cms/generate-full.js",
);

/** Mirrors the BLOCKS_LAYOUT.md freshness test in block-docs.test.js: the
 *  committed .pages.yml must match what the full-config generator produces,
 *  so any change to BLOCK_CMS_FIELDS or the generator output shape forces a
 *  regeneration rather than silently drifting. */
describe("pages-yml-freshness", () => {
  test(".pages.yml matches generator output", () => {
    const committed = readFileSync(PAGES_YML_PATH, "utf-8");
    execSync(`bun ${GENERATOR_SCRIPT}`, { cwd: rootDir, stdio: "pipe" });
    const regenerated = readFileSync(PAGES_YML_PATH, "utf-8");
    expect(regenerated).toBe(committed);
  });
});
