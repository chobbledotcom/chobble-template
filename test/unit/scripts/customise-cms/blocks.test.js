import { describe, expect, test } from "bun:test";
import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import { mockModule } from "#test/test-utils.js";
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

describe("generateBlocksField - envelope", () => {
  test("produces a blocks field with the expected shape", () => {
    const field = generateBlocksField(["section-header"], false);

    expect(field).toMatchObject({
      name: "blocks",
      label: "Content Blocks",
      type: "block",
      list: true,
      blockKey: "type",
    });
    expect(Array.isArray(field.blocks)).toBe(true);
  });

  test("returns one block per requested type, in order", () => {
    const field = generateBlocksField(["section-header", "cta", "hero"], false);

    expect(field.blocks.map((b) => b.name)).toEqual([
      "section-header",
      "cta",
      "hero",
    ]);
  });

  test("returns an empty blocks array when given no types", () => {
    const field = generateBlocksField([], false);
    expect(field.blocks).toEqual([]);
  });
});

describe("generateBlocksField - block component shape", () => {
  test("tags each block with _componentName derived from the block type", () => {
    const field = generateBlocksField(
      ["section-header", "video-background"],
      false,
    );

    expect(field.blocks.map((b) => b._componentName)).toEqual([
      "block_section_header",
      "block_video_background",
    ]);
  });

  test("derives a human-readable label from the slug", () => {
    const field = generateBlocksField(
      ["section-header", "cta", "split-icon-links"],
      false,
    );

    expect(field.blocks.map((b) => b.label)).toEqual([
      "Section Header",
      "Cta",
      "Split Icon Links",
    ]);
  });

  test("wraps block fields in an object type", () => {
    const field = generateBlocksField(["section-header"], false);

    expect(field.blocks[0].type).toBe("object");
  });

  test("throws when the block type isn't defined in BLOCK_CMS_FIELDS", () => {
    expect(() =>
      generateBlocksField(["definitely-not-a-real-block"], false),
    ).toThrow(/is not defined in BLOCK_CMS_FIELDS/);
  });
});

describe("generateBlocksField - markdown field conversion", () => {
  // section-header.intro is a markdown-typed schema field.
  test("produces a rich-text field when visual editor is enabled", () => {
    const field = generateBlocksField(["section-header"], true);
    const intro = field.blocks[0].fields.find((f) => f.name === "intro");

    expect(intro.type).toBe("rich-text");
  });

  test("produces a code/markdown field when visual editor is disabled", () => {
    const field = generateBlocksField(["section-header"], false);
    const intro = field.blocks[0].fields.find((f) => f.name === "intro");

    expect(intro.type).toBe("code");
    expect(intro.options).toEqual({ language: "markdown" });
  });
});

describe("generateBlocksField - reference field conversion", () => {
  test("converts reference schema fields into CMS reference fields", () => {
    // items-array.items is a reference field with collection:"pages", multiple:true.
    const field = generateBlocksField(["items-array"], false);
    const items = field.blocks[0].fields.find((f) => f.name === "items");

    expect(items.type).toBe("reference");
    expect(items.options.collection).toBe("pages");
    expect(items.list).toBe(true);
  });
});

describe("generateBlocksField - primitive field conversion", () => {
  test("maps string/number/boolean/image primitives to generic CMS fields", () => {
    // split-image covers string, number, boolean, and image in one block.
    const field = generateBlocksField(["split-image"], false);
    const byName = Object.fromEntries(
      field.blocks[0].fields.map((f) => [f.name, f]),
    );

    expect(byName.title.type).toBe("string");
    expect(byName.title_level.type).toBe("number");
    expect(byName.reverse.type).toBe("boolean");
    expect(byName.figure_src.type).toBe("image");
  });

  test("propagates required flag on primitive fields", () => {
    // items-array.collection is a string field with required:true.
    const field = generateBlocksField(["items-array"], false);
    const collection = field.blocks[0].fields.find(
      (f) => f.name === "collection",
    );

    expect(collection.required).toBe(true);
  });

  test("recurses into nested object-type fields", () => {
    // features.items is an object list with nested string fields.
    const field = generateBlocksField(["features"], false);
    const items = field.blocks[0].fields.find((f) => f.name === "items");

    expect(items.type).toBe("object");
    expect(items.list).toBe(true);
    expect(items.fields.length).toBeGreaterThan(0);
    expect(items.fields.find((f) => f.name === "title").required).toBe(true);
  });
});

describe("generateBlocksField - schema consistency", () => {
  test("each block's field count matches its BLOCK_CMS_FIELDS schema", () => {
    const blockTypes = Object.keys(BLOCK_CMS_FIELDS);
    const field = generateBlocksField(blockTypes, false);

    for (const block of field.blocks) {
      const schema = BLOCK_CMS_FIELDS[block.name];
      expect(block.fields.length).toBe(Object.keys(schema).length);
    }
  });
});

describe("generateBlocksField - unknown schema type", () => {
  test("throws a descriptive error for unknown schema field types", async () => {
    // BLOCK_CMS_FIELDS only accepts a fixed set of type strings. Injecting
    // "rich-text" (a common footgun — the right value is "markdown") should
    // trip the defensive guard in schemaFieldToCmsField.
    await mockModule("#utils/block-schema.js", () => ({
      BLOCK_CMS_FIELDS: {
        "bad-block": {
          broken: { type: "rich-text", label: "Broken" },
        },
      },
    }));

    expect(() => generateBlocksField(["bad-block"], false)).toThrow(
      /Invalid field type "rich-text" for field "broken"/,
    );
  });
});
