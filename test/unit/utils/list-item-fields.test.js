import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CONFIG_SCHEMA, DEFAULTS } from "#config/config-schema.js";
import listItemFields from "#data/listItemFields.js";
import { ROOT_DIR } from "#lib/paths.js";

const INCLUDES_DIR = join(ROOT_DIR, "src/_includes");

describe("list-item-fields", () => {
  test("each accepted field has a matching list-item include file", () => {
    for (const field of CONFIG_SCHEMA.list_item_fields.choices ?? []) {
      const includePath = join(INCLUDES_DIR, `list-item-${field}.html`);
      expect(existsSync(includePath)).toBe(true);
    }
  });

  test("the listItemFields data resolves from the merged site config", () => {
    // config.json leaves list_item_fields unset, so the schema default is
    // the single source of truth for what list items render.
    expect(listItemFields).toEqual(DEFAULTS.list_item_fields);
  });
});
