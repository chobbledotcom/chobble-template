import { describe, expect, test } from "bun:test";
import { collectItemErrors, validateItem } from "#utils/validate-item.js";

/** Run collectItemErrors on a tagged page with a single block and return errors */
const errorsForBlock = (blockType, blockData) =>
  collectItemErrors({
    name: "My Page",
    tags: ["pages"],
    blocks: [{ type: blockType, ...blockData }],
  });

describe("collectItemErrors", () => {
  test("returns empty array when name is present", () => {
    expect(
      collectItemErrors({ name: "Widget Pro", tags: ["products"] }),
    ).toEqual([]);
  });

  test("returns empty array for untagged utility templates without name", () => {
    expect(collectItemErrors({ subtitle: "A utility page" })).toEqual([]);
  });

  test("returns empty array for excluded pagination templates without name", () => {
    expect(
      collectItemErrors({
        tags: ["pages"],
        eleventyExcludeFromCollections: true,
      }),
    ).toEqual([]);
  });

  test("returns error when tagged item is missing name", () => {
    const errors = collectItemErrors(
      { tags: ["pages"], subtitle: "A page" },
      " in test.md",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('missing required "name" field');
    expect(errors[0]).toContain("in test.md");
  });

  test("returns error when tagged item has empty name", () => {
    const errors = collectItemErrors({ name: "", tags: ["pages"] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('missing required "name" field');
  });

  test("returns empty array when item has no blocks", () => {
    expect(
      collectItemErrors({
        name: "Widget",
        tags: ["products"],
        subtitle: "Nice",
      }),
    ).toEqual([]);
  });

  test("returns empty array for block types without named object-list fields", () => {
    expect(
      collectItemErrors({
        name: "My Item",
        tags: ["pages"],
        blocks: [{ type: "markdown", content: "Hello" }],
      }),
    ).toEqual([]);
  });

  test("returns error for features block item missing name", () => {
    const errors = errorsForBlock("features", {
      items: [
        { icon: "star", name: "Good Feature", description: "Works" },
        { icon: "heart", description: "Missing name" },
      ],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"features"');
    expect(errors[0]).toContain('"items[1]"');
    expect(errors[0]).toContain('"name"');
  });

  test("returns error for features block item missing icon or description", () => {
    const missingIcon = errorsForBlock("features", {
      items: [
        { name: "Feature", icon: "star", description: "Desc" },
        { name: "No Icon", description: "Missing icon" },
      ],
    });
    expect(missingIcon).toHaveLength(1);
    expect(missingIcon[0]).toContain('"icon"');

    const missingDesc = errorsForBlock("features", {
      items: [
        { name: "Feature", icon: "star", description: "Desc" },
        { name: "No Desc", icon: "star" },
      ],
    });
    expect(missingDesc).toHaveLength(1);
    expect(missingDesc[0]).toContain('"description"');
  });

  test("returns error for features block item missing multiple fields", () => {
    const errors = errorsForBlock("features", {
      items: [{ name: "Good", icon: "star", description: "Desc" }, {}],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"name"');
    expect(errors[0]).toContain('"icon"');
    expect(errors[0]).toContain('"description"');
  });

  test("returns error for video-cards block video missing name", () => {
    const errors = errorsForBlock("video-cards", {
      videos: [{ id: "abc123", name: "Good Video" }, { id: "xyz789" }],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"video-cards"');
    expect(errors[0]).toContain('"videos[1]"');
  });

  test("aggregates multiple missing name errors across blocks", () => {
    const data = {
      name: "My Page",
      tags: ["pages"],
      blocks: [
        {
          type: "features",
          items: [{ description: "no name 1" }, { description: "no name 2" }],
        },
        { type: "image-cards", items: [{ image: "/img.jpg" }] },
      ],
    };
    expect(collectItemErrors(data)).toHaveLength(3);
  });

  test("aggregates item-level and nested block errors together", () => {
    const errors = collectItemErrors(
      {
        tags: ["pages"],
        blocks: [{ type: "features", items: [{ description: "no name" }] }],
      },
      " in file.md",
    );
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("Item is missing required");
    expect(errors[1]).toContain("features");
  });
});

describe("validateItem", () => {
  test("does not throw when item has name and valid blocks", () => {
    expect(() =>
      validateItem({
        name: "Valid Item",
        tags: ["pages"],
        blocks: [{ type: "markdown", content: "Hello" }],
      }),
    ).not.toThrow();
  });

  test("does not throw for untagged utility templates without name", () => {
    expect(() => validateItem({ subtitle: "utility page" })).not.toThrow();
  });

  test("throws when tagged item is missing name", () => {
    expect(() =>
      validateItem({ tags: ["pages"], subtitle: "No name" }, " in test.md"),
    ).toThrow('missing required "name" field');
  });

  test("throws when nested block item is missing name", () => {
    expect(() =>
      validateItem({
        name: "My Page",
        tags: ["pages"],
        blocks: [{ type: "features", items: [{ icon: "star" }] }],
      }),
    ).toThrow('"features"');
  });

  test("throws all errors at once when multiple names are missing", () => {
    expect(() =>
      validateItem({
        tags: ["pages"],
        blocks: [
          { type: "features", items: [{ description: "no name" }] },
          { type: "video-cards", videos: [{ id: "abc" }] },
        ],
      }),
    ).toThrow(/Item is missing required[\s\S]*"features"[\s\S]*"video-cards"/);
  });
});
