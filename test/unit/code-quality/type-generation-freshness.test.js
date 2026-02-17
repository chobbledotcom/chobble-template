import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

const GENERATED_FILE = join(rootDir, "src/_lib/types/pages-cms-generated.d.ts");
const GENERATOR_SCRIPT = join(rootDir, "scripts/generate-pages-cms-types.js");

describe("type-generation-freshness", () => {
  test("pages-cms-generated.d.ts matches .pages.yml schema", () => {
    const committed = readFileSync(GENERATED_FILE, "utf-8");

    // Run the generator and capture what it would produce
    execSync(`bun ${GENERATOR_SCRIPT}`, { cwd: rootDir, stdio: "pipe" });
    const regenerated = readFileSync(GENERATED_FILE, "utf-8");

    expect(regenerated).toBe(committed);
  });
});
