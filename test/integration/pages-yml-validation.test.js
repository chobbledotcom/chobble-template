import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import YAML from "yaml";
import { ROOT_DIR } from "#lib/paths.js";

const PAGES_CMS_REPO = "https://github.com/pages-cms/pages-cms";
const PAGES_CMS_CACHE = "/tmp/pages-cms-validation-cache";
const SCHEMA_FILENAME = "config-schema.ts";
const TEMP_SCHEMA_PATH = path.join(
  ROOT_DIR,
  ".cache",
  `pages-cms-${SCHEMA_FILENAME}`,
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
    // Core field types are discovered from the directory listing (the source
    // of truth), so the cache must expose them.
    const coreFieldTypes = () => {
      const coreDir = path.join(PAGES_CMS_CACHE, "fields", "core");
      if (!fs.existsSync(coreDir)) return [];
      return fs
        .readdirSync(coreDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    };
    // A partial or interrupted clone can leave a valid-looking sentinel with
    // an empty fields/core, which silently disables schema validation. Test
    // the layout, not just the sentinel, and recover once.
    const cacheHealthy = () =>
      fs.existsSync(path.join(PAGES_CMS_CACHE, "lib", SCHEMA_FILENAME)) &&
      coreFieldTypes().length > 0;
    if (!cacheHealthy()) {
      fs.rmSync(PAGES_CMS_CACHE, { recursive: true, force: true });
      try {
        execSync(`git clone --depth 1 ${PAGES_CMS_REPO} ${PAGES_CMS_CACHE}`, {
          stdio: "pipe",
          timeout: 120_000,
        });
      } catch (err) {
        // Offline local runs skip with a warning; CI has network, so there
        // a clone failure must fail the suite rather than silently skip
        // schema validation forever.
        if (process.env.CI) {
          throw new Error(`Cloning ${PAGES_CMS_REPO} failed: ${err.message}`);
        }
        console.warn(
          "Skipping Pages CMS schema validation: clone failed (offline?)",
        );
        state.skip = true;
        return;
      }
      if (!cacheHealthy()) {
        throw new Error(
          `Cloned ${PAGES_CMS_REPO}, but fields/core does not expose the field type registry this harness derives types from. Update the harness for the upstream layout.`,
        );
      }
    }

    // Read the actual config-schema.ts from Pages CMS and replace the field
    // registry import with a static set derived from the actual core field
    // types directory. The registry uses webpack's require.context which
    // isn't available outside Next.js.
    const RAW_SCHEMA_PATH = path.join(PAGES_CMS_CACHE, "lib", SCHEMA_FILENAME);
    const fieldTypesImportPattern =
      /import\s*\{[^}]*fieldTypes[^}]*\}\s*from\s*["']@\/fields\/registry["'];?/;
    const rawSchema = fs.readFileSync(RAW_SCHEMA_PATH, "utf8");
    if (!fieldTypesImportPattern.test(rawSchema)) {
      throw new Error(
        "pages-cms config schema no longer imports fieldTypes from @/fields/registry; update this harness for the upstream layout.",
      );
    }
    const schemaSource = rawSchema.replace(
      fieldTypesImportPattern,
      `const fieldTypes = new Set(${JSON.stringify(coreFieldTypes())});`,
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
    if (state.skip) return;
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
