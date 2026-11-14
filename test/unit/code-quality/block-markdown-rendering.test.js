import { describe, expect, test } from "vitest";
import { analyzeBlockMarkdown } from "#test/test-utils.js";
import { BLOCK_SCHEMAS } from "#utils/block-schema.js";

describe("block-markdown-rendering", () => {
  test("scans a nonempty block registry", () => {
    expect(Object.keys(BLOCK_SCHEMAS).length).toBeGreaterThan(0);
  });

  test.each(
    Object.keys(BLOCK_SCHEMAS),
  )("%s renders schema fields with the correct markdown pipeline and prose wrapper", (type) => {
    expect(analyzeBlockMarkdown(type)).toEqual([]);
  });
});
