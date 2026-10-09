import { describe, expect, test } from "vitest";
import {
  buildViewConfig,
  generateCollectionConfig,
  getCoreFields,
} from "#scripts/customise-cms/collection-config.js";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";

describe("generateCollectionConfig", () => {
  test("throws for an unknown collection name", () => {
    expect(() =>
      generateCollectionConfig("bogus", createDefaultConfig()),
    ).toThrow('Unknown collection "bogus" in cms_config');
  });

  test.each([
    "pages",
    "news",
    "guide-categories",
    "guide-pages",
  ])("%s omits body because its content is block-only", (collectionName) => {
    const config = createDefaultConfig();
    const collection = generateCollectionConfig(collectionName, config);
    expect(collection.fields.map((field) => field.name)).not.toContain("body");
  });

  test("snippets retain body content", () => {
    const collection = generateCollectionConfig(
      "snippets",
      createDefaultConfig(),
    );
    expect(collection.fields.map((field) => field.name)).toContain("body");
  });
});

describe("getCoreFields", () => {
  test("throws for a defined collection with no field builder", () => {
    // Defensive guard: reachable only if a new collection definition is
    // added without wiring a field builder for it.
    expect(() => getCoreFields("bogus", createDefaultConfig())).toThrow(
      'No field builder for collection "bogus"',
    );
  });
});

describe("buildViewConfig", () => {
  const view = { fields: ["name", "date"], primary: "name", sort: ["date"] };

  test("keeps only the fields the collection actually has", () => {
    const result = buildViewConfig("news", view, ["name", "date", "extra"]);

    expect(result).toEqual(view);
  });

  test("throws when the primary or a sort field is missing", () => {
    expect(() => buildViewConfig("news", view, ["name"])).toThrow(
      'View config for "news" references missing fields: date',
    );
  });

  test("throws when no listed field is available", () => {
    const sparse = { fields: ["gone"], primary: "name", sort: ["name"] };

    expect(() => buildViewConfig("news", sparse, ["name"])).toThrow(
      'View config for "news" has no available fields',
    );
  });
});
