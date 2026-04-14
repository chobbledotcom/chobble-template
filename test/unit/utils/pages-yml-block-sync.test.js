import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { rootDir } from "#test/test-utils.js";
import { collectBlockReferences } from "#test/unit/utils/pages-yml-helpers.js";
import { BLOCK_CMS_FIELDS, BLOCK_SCHEMAS } from "#utils/block-schema.js";

/** Inverse of scripts/customise-cms/generator.js#blockTypeToComponentName —
 *  turns `block_section_header` back into `section-header`. */
const componentNameToBlockType = (componentName) =>
  componentName.replace(/^block_/, "").replace(/_/g, "-");

/** Auto-injected wrapper fields that the generator prepends to every block
 *  component. Mirrors CONTAINER_FIELDS in src/_lib/utils/block-schema/shared.js. */
const CONTAINER_FIELD_NAMES = ["container_width", "section_class"];

const PAGES_YML_PATH = join(rootDir, ".pages.yml");
const parsedPagesYml = YAML.parse(readFileSync(PAGES_YML_PATH, "utf-8"));
const components = parsedPagesYml.components || {};
const blockComponents = Object.fromEntries(
  Object.entries(components).filter(([name]) => name.startsWith("block_")),
);

const blockReferences = collectBlockReferences(parsedPagesYml);

describe(".pages.yml components ↔ BLOCK_CMS_FIELDS", () => {
  test("every block_* component corresponds to a known block type", () => {
    const unknown = Object.keys(blockComponents)
      .filter((name) => !(componentNameToBlockType(name) in BLOCK_CMS_FIELDS))
      .sort();
    expect(unknown).toEqual([]);
  });

  test("every BLOCK_CMS_FIELDS type has a block_* component", () => {
    const existing = Object.keys(blockComponents).map(componentNameToBlockType);
    const missing = Object.keys(BLOCK_CMS_FIELDS)
      .filter((type) => !existing.includes(type))
      .sort();
    expect(missing).toEqual([]);
  });

  test("every block component has the container wrapper fields first", () => {
    const violations = Object.entries(blockComponents)
      .filter(([, def]) => Array.isArray(def.fields))
      .flatMap(([name, def]) => {
        const firstNames = def.fields.slice(0, 2).map((f) => f.name);
        return JSON.stringify(firstNames) ===
          JSON.stringify(CONTAINER_FIELD_NAMES)
          ? []
          : [
              `${name}: expected first two fields to be ${CONTAINER_FIELD_NAMES.join(", ")}, got ${firstNames.join(", ")}`,
            ];
      });
    expect(violations).toEqual([]);
  });

  test("every component field name matches BLOCK_CMS_FIELDS (or is a container field)", () => {
    const violations = Object.entries(blockComponents).flatMap(
      ([name, def]) => {
        const blockType = componentNameToBlockType(name);
        const schemaFields = BLOCK_CMS_FIELDS[blockType];
        if (!schemaFields || !Array.isArray(def.fields)) return [];
        const yamlFieldNames = def.fields.map((f) => f.name);
        const expectedFieldNames = [
          ...CONTAINER_FIELD_NAMES,
          ...Object.keys(schemaFields),
        ];
        const extra = yamlFieldNames.filter(
          (n) => !expectedFieldNames.includes(n),
        );
        const missing = expectedFieldNames.filter(
          (n) => !yamlFieldNames.includes(n),
        );
        return [
          ...extra.map((n) => `${name}: extra field "${n}" in .pages.yml`),
          ...missing.map((n) => `${name}: missing field "${n}" in .pages.yml`),
        ];
      },
    );
    expect(violations).toEqual([]);
  });
});

describe(".pages.yml block references ↔ BLOCK_SCHEMAS", () => {
  test("at least one blocks: list exists (sanity check)", () => {
    expect(blockReferences.length).toBeGreaterThan(0);
  });

  test("every block reference points to a known block type", () => {
    const unknown = blockReferences
      .filter((ref) => !(ref.name in BLOCK_SCHEMAS))
      .map((ref) => ref.name)
      .sort();
    expect([...new Set(unknown)]).toEqual([]);
  });

  test("every block reference points to an existing component", () => {
    const dangling = blockReferences
      .filter((ref) => !(ref.component in blockComponents))
      .map((ref) => `${ref.name} -> ${ref.component}`)
      .sort();
    expect([...new Set(dangling)]).toEqual([]);
  });

  test("every block reference uses the canonical component name", () => {
    const mismatches = blockReferences
      .filter((ref) => ref.component !== `block_${ref.name.replace(/-/g, "_")}`)
      .map(
        (ref) =>
          `${ref.name}: component "${ref.component}" should be "block_${ref.name.replace(/-/g, "_")}"`,
      );
    expect(mismatches).toEqual([]);
  });

  test("every BLOCK_CMS_FIELDS type is referenced by at least one page", () => {
    const referenced = blockReferences.map((r) => r.name);
    const unreachable = Object.keys(BLOCK_CMS_FIELDS)
      .filter((type) => !referenced.includes(type))
      .sort();
    expect(unreachable).toEqual([]);
  });
});
