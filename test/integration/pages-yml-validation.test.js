import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT_DIR } from "#lib/paths.js";

const PAGES_CMS_REPO = "https://github.com/pages-cms/pages-cms";
const PAGES_CMS_CACHE = "/tmp/pages-cms-validation-cache";
const TEMP_SCHEMA_PATH = path.join(
  ROOT_DIR,
  ".cache",
  "pages-cms-configSchema.ts",
);

/**
 * Validates .pages.yml against the actual Pages CMS config schema.
 *
 * Clones the pages-cms source code, extracts its Zod config schema, discovers
 * valid field types from its directory structure, and validates our config.
 */
describe("pages.yml validation against Pages CMS schema", () => {
  const state = { ConfigSchema: null };

  beforeAll(async () => {
    // Clone pages-cms if not already cached
    if (!fs.existsSync(path.join(PAGES_CMS_CACHE, "lib", "configSchema.ts"))) {
      execSync(`git clone --depth 1 ${PAGES_CMS_REPO} ${PAGES_CMS_CACHE}`, {
        stdio: "pipe",
        timeout: 120_000,
      });
    }

    // Read core field types from directory listing (the source of truth)
    const coreFieldTypes = fs
      .readdirSync(path.join(PAGES_CMS_CACHE, "fields", "core"), {
        withFileTypes: true,
      })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // Read the actual configSchema.ts from Pages CMS and replace the field
    // registry import with a static set derived from the actual core field
    // types directory. The registry uses webpack's require.context which
    // isn't available outside Next.js.
    const schemaSource = fs
      .readFileSync(
        path.join(PAGES_CMS_CACHE, "lib", "configSchema.ts"),
        "utf8",
      )
      .replace(
        /import\s*\{[^}]*fieldTypes[^}]*\}\s*from\s*["']@\/fields\/registry["'];?/,
        `const fieldTypes = new Set(${JSON.stringify(coreFieldTypes)});`,
      );

    // Write modified schema to .cache/ (gitignored)
    fs.mkdirSync(path.join(ROOT_DIR, ".cache"), { recursive: true });
    fs.writeFileSync(TEMP_SCHEMA_PATH, schemaSource);

    // Dynamically import the schema
    const mod = await import(TEMP_SCHEMA_PATH);
    state.ConfigSchema = mod.ConfigSchema;
  }, 180_000);

  afterAll(() => {
    fs.rmSync(TEMP_SCHEMA_PATH, { force: true });
  });

  test(".pages.yml passes Pages CMS config schema validation", () => {
    const pagesYmlContent = fs.readFileSync(
      path.join(ROOT_DIR, ".pages.yml"),
      "utf8",
    );
    const config = YAML.parse(pagesYmlContent);
    const result = state.ConfigSchema.safeParse(config);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => {
        const loc = issue.path.join(".");
        return `  [${issue.code}] ${loc}: ${issue.message}`;
      });
      throw new Error(
        `.pages.yml validation failed with ${result.error.issues.length} error(s):\n${messages.join("\n")}`,
      );
    }

    expect(result.success).toBe(true);
  });
});
