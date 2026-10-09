import { describe, expect, test } from "vitest";
import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

describe("generateBlocksField envelope", () => {
  test("wraps blocks in a block-type list field keyed by type", () => {
    const field = generateBlocksField(["section-header"]);

    expect(field).toMatchObject({
      name: "blocks",
      label: "Content Blocks",
      type: "block",
      list: true,
      blockKey: "type",
    });
  });

  test("sorts requested block types alphabetically by name", () => {
    const field = generateBlocksField(["section-header", "cta", "hero"]);

    expect(field.blocks.map((b) => b.name)).toEqual([
      "cta",
      "hero",
      "section-header",
    ]);
  });
});

describe("generateBlocksField block component", () => {
  test("derives a _componentName by replacing hyphens with underscores", () => {
    const field = generateBlocksField(["section-header", "image-background"]);

    expect(field.blocks.map((b) => b._componentName)).toEqual([
      "block_image_background",
      "block_section_header",
    ]);
  });

  test("derives a human-readable label from the slug", () => {
    const field = generateBlocksField([
      "cta",
      "section-header",
      "split-icon-links",
    ]);

    expect(field.blocks.map((b) => b.label)).toEqual([
      "Cta",
      "Section Header",
      "Split Icon Links",
    ]);
  });
});

describe("generateBlocksField markdown field conversion", () => {
  test("emits a rich-text field for a markdown-typed schema field", () => {
    // section-header.intro is a markdown-typed schema field.
    const intro = generateBlocksField(["section-header"]).blocks[0].fields.find(
      (f) => f.name === "intro",
    );

    expect(intro.type).toBe("rich-text");
    expect(intro.options).toBeUndefined();
  });
});

describe("generateBlocksField list field conversion", () => {
  test("exposes the supported optional accessible label for feature icons", () => {
    const [{ fields }] = generateBlocksField(["features"]).blocks;
    expect(
      fields.find((field) => field.name === "items").fields,
    ).toContainEqual({
      name: "icon_label",
      label: "Icon Accessible Label",
      type: "string",
    });
  });

  test("emits a list string field for items-array.items paths", () => {
    // items-array.items declares type:"string" with list:true to accept an
    // array of file paths.
    const field = generateBlocksField(["items-array"]);
    const items = field.blocks[0].fields.find((f) => f.name === "items");

    expect(items.type).toBe("string");
    expect(items.list).toBe(true);
  });
});

describe("generateBlocksField reference conversion", () => {
  test("preserves the snippet target and required scalar shape", () => {
    const field = generateBlocksField(["snippet"]);
    const reference = field.blocks[0].fields.find(
      (candidate) => candidate.name === "reference",
    );

    expect(reference).toMatchObject({
      type: "reference",
      required: true,
      options: { collection: "snippets", label: "{fields.name}" },
    });
    expect(reference.list).toBeUndefined();
  });
});

describe("generateBlocksField generic field conversion", () => {
  test("passes primitive type strings through verbatim", () => {
    // split-image covers string, boolean, and image in one block.
    const field = generateBlocksField(["split-image"]);
    const byName = Object.fromEntries(
      field.blocks[0].fields.map((f) => [f.name, f]),
    );

    expect(byName.subtitle.type).toBe("string");
    expect(byName.reverse.type).toBe("boolean");
    expect(byName.figure_src.type).toBe("image");
  });

  test("propagates required:true from the schema", () => {
    // items.collection is required:true.
    const field = generateBlocksField(["items"]);
    const collection = field.blocks[0].fields.find(
      (f) => f.name === "collection",
    );

    expect(collection.required).toBe(true);
  });

  test("recursively converts nested object fields", () => {
    // features.items is an object list whose nested fields include a
    // required:true primitive, so this verifies the recursive dispatch.
    const field = generateBlocksField(["features"]);
    const items = field.blocks[0].fields.find((f) => f.name === "items");
    const nameField = items.fields.find((f) => f.name === "name");

    expect(items.list).toBe(true);
    expect(nameField.required).toBe(true);
  });
});

describe("generateBlocksField schema coverage", () => {
  test("emits one CMS field per schema key for every real block", () => {
    // Regression guard: detects if any schema field is silently dropped.
    const blockTypes = Object.keys(BLOCK_CMS_FIELDS);
    const field = generateBlocksField(blockTypes);

    for (const block of field.blocks) {
      const schema = BLOCK_CMS_FIELDS[block.name];
      expect(block.fields.length).toBe(Object.keys(schema).length);
    }
  });
});
