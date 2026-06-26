import { describe, expect, test } from "bun:test";
import { BLOCK_SCHEMAS, validateBlocks } from "#utils/block-schema.js";

describe("menu block `cards` field", () => {
  test("is declared as a boolean field", () => {
    expect(BLOCK_SCHEMAS.menu.cards.type).toBe("boolean");
  });

  test("accepts cards: true", () => {
    expect(() => validateBlocks([{ type: "menu", cards: true }])).not.toThrow();
  });

  test("accepts cards: false", () => {
    expect(() =>
      validateBlocks([{ type: "menu", cards: false }]),
    ).not.toThrow();
  });

  test("rejects a non-boolean cards value", () => {
    expect(() => validateBlocks([{ type: "menu", cards: "yes" }])).toThrow(
      'Block "menu" field "cards" must be a boolean but got string',
    );
  });
});
