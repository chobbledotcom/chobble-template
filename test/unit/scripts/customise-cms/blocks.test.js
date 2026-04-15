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

  test("preserves the input order of requested block types", () => {
    const field = generateBlocksField(["section-header", "cta", "hero"], false);

    expect(field.blocks.map((b) => b.name)).toEqual([
      "section-header",
      "cta",
      "hero",
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
  test("emits a rich-text field when visual editor is enabled", () => {
    const field = generateBlocksField(["section-header"], true);
    const intro = field.blocks[0].fields.find((f) => f.name === "intro");

    expect(intro.type).toBe("rich-text");
  });

  test("emits a code/markdown field when visual editor is disabled", () => {
    const field = generateBlocksField(["section-header"], false);
    const intro = field.blocks[0].fields.find((f) => f.name === "intro");

    expect(intro.type).toBe("code");
    expect(intro.options).toEqual({ language: "markdown" });
  });
});

describe("generateBlocksField reference field conversion", () => {
  test("passes the target collection through to the CMS reference", () => {
    // items-array.items declares collection:"pages" and multiple:true.
    const field = generateBlocksField(["items-array"], false);
    const items = field.blocks[0].fields.find((f) => f.name === "items");

    expect(items.type).toBe("reference");
    expect(items.options.collection).toBe("pages");
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
