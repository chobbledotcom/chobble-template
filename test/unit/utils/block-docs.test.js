import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { rootDir } from "#test/test-utils.js";
import { collectBlockReferences } from "#test/unit/utils/pages-yml-helpers.js";
import { BLOCK_DOCS } from "#utils/block-schema.js";

const BLOCKS_LAYOUT_PATH = join(rootDir, "BLOCKS_LAYOUT.md");
const GENERATOR_SCRIPT = join(rootDir, "scripts/generate-blocks-reference.js");
const PAGES_YML_PATH = join(rootDir, ".pages.yml");

describe("BLOCK_DOCS quality", () => {
  test("every BLOCK_DOCS entry has a summary", () => {
    const missing = Object.entries(BLOCK_DOCS)
      .filter(([, doc]) => !doc.summary)
      .map(([type]) => type);
    expect(missing).toEqual([]);
  });

  test("every BLOCK_DOCS param has type and description", () => {
    const violations = Object.entries(BLOCK_DOCS).flatMap(([type, doc]) =>
      Object.entries(doc.params).flatMap(([key, param]) => [
        ...(!param.type ? [`${type}.${key} missing type`] : []),
        ...(!param.description ? [`${type}.${key} missing description`] : []),
      ]),
    );
    expect(violations).toEqual([]);
  });
});

describe("BLOCKS_LAYOUT.md freshness", () => {
  test("BLOCKS_LAYOUT.md matches generated output", () => {
    const committed = readFileSync(BLOCKS_LAYOUT_PATH, "utf-8");
    execSync(`bun ${GENERATOR_SCRIPT}`, { cwd: rootDir, stdio: "pipe" });
    const regenerated = readFileSync(BLOCKS_LAYOUT_PATH, "utf-8");
    expect(regenerated).toBe(committed);
  });
});

describe(".pages.yml ↔ BLOCKS_LAYOUT.md coverage", () => {
  const parsedPagesYml = YAML.parse(readFileSync(PAGES_YML_PATH, "utf-8"));
  const cmsReachableTypes = new Set(
    collectBlockReferences(parsedPagesYml).map((r) => r.name),
  );

  test("every CMS-reachable block type has BLOCK_DOCS with a summary", () => {
    const missing = [...cmsReachableTypes]
      .filter((type) => !BLOCK_DOCS[type]?.summary)
      .sort();
    expect(missing).toEqual([]);
  });
});
