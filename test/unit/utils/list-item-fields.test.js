import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { selectListItemFields } from "#config/list-config.js";
import listItemFields from "#data/listItemFields.js";
import { ROOT_DIR } from "#lib/paths.js";

const INCLUDES_DIR = join(ROOT_DIR, "src/_includes");

describe("list-item-fields", () => {
  test("each default field has a matching list-item include file", () => {
    const defaults = selectListItemFields([]);
    for (const field of defaults) {
      const includePath = join(INCLUDES_DIR, `list-item-${field}.html`);
      expect(existsSync(includePath)).toBe(true);
    }
  });

  test("custom config overrides defaults", () => {
    const custom = ["thumbnail", "price"];
    expect(selectListItemFields(custom)).toEqual(custom);
  });

  test("empty config falls back to defaults", () => {
    expect(selectListItemFields([])).toEqual(listItemFields);
  });
});
