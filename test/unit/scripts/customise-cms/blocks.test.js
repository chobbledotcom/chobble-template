import { describe, expect, test } from "bun:test";
import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

describe("generateBlocksField envelope", () => {
  test("wraps blocks in a block-type list field keyed by type", () => {
    const field = generateBlocksField(["section-header"], false);

    expect(field).toMatchObject({
      name: "blocks",
      label: "Content Blocks",
      type: "block",
      list: true,
      blockKey: "type",
    });
  });

  test("sorts requested block types alphabetically by name", () => {
    const field = generateBlocksField(["section-header", "cta", "hero"], false);

    expect(field.blocks.map((b) => b.name)).toEqual([
      "cta",
      "hero",
      "section-header",
    ]);
  });
});

describe("generateBlocksField block component", () => {
  test("derives a _componentName by replacing hyphens with underscores", () => {
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
      ["cta", "section-header", "split-icon-links"],
      false,
    );

    expect(field.blocks.map((b) => b.label)).toEqual([
      "Cta",
      "Section Header",
      "Split Icon Links",
    ]);
  });
});

describe("generateBlocksField markdown field conversion", () => {
  // section-header.intro is a markdown-typed schema field.
  const getIntroField = (blockTypes, visual) => {
    const field = generateBlocksField(blockTypes, visual);
    return field.blocks[0].fields.find((f) => f.name === "intro");
  };

  test("emits a rich-text field when visual editor is enabled", () => {
    const intro = getIntroField(["section-header"], true);

    expect(intro.type).toBe("rich-text");
  });

  test("emits a code/markdown field when visual editor is disabled", () => {
    const intro = getIntroField(["section-header"], false);

    expect(intro.type).toBe("code");
    expect(intro.options).toEqual({ language: "markdown" });
  });
});

describe("generateBlocksField list field conversion", () => {
  test("emits a list string field for items-array.items paths", () => {
    // items-array.items declares type:"string" with list:true to accept an
    // array of file paths.
    const field = generateBlocksField(["items-array"], false);
    const items = field.blocks[0].fields.find((f) => f.name === "items");

    expect(items.type).toBe("string");
    expect(items.list).toBe(true);
  });
});

describe("generateBlocksField generic field conversion", () => {
  test("passes primitive type strings through verbatim", () => {
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

  test("propagates required:true from the schema", () => {
    // items.collection is required:true.
    const field = generateBlocksField(["items"], false);
    const collection = field.blocks[0].fields.find(
      (f) => f.name === "collection",
    );

    expect(collection.required).toBe(true);
  });

  test("recursively converts nested object fields", () => {
    // features.items is an object list whose nested fields include a
    // required:true primitive, so this verifies the recursive dispatch.
    const field = generateBlocksField(["features"], false);
    const items = field.blocks[0].fields.find((f) => f.name === "items");
    const title = items.fields.find((f) => f.name === "title");

    expect(items.list).toBe(true);
    expect(title.required).toBe(true);
  });
});

describe("generateBlocksField schema coverage", () => {
  test("emits one CMS field per schema key for every real block", () => {
    // Regression guard: detects if any schema field is silently dropped.
    const blockTypes = Object.keys(BLOCK_CMS_FIELDS);
    const field = generateBlocksField(blockTypes, false);

    for (const block of field.blocks) {
      const schema = BLOCK_CMS_FIELDS[block.name];
      expect(block.fields.length).toBe(Object.keys(schema).length);
    }
  });
});
