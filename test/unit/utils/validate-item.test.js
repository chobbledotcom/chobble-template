import { describe, expect, test } from "vitest";
import { collectItemErrors } from "#utils/validate-item.js";

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

  test("leaves block validation to the shared block-schema validator", () => {
    expect(
      collectItemErrors({
        name: "My Item",
        tags: ["pages"],
        blocks: [{ type: "markdown" }],
      }),
    ).toEqual([]);
  });
});
