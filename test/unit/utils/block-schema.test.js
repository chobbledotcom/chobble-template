import { describe, expect, test } from "bun:test";
import {
  BLOCK_DOCS,
  BLOCK_SCHEMAS,
  getBlockContainerWidth,
  validateBlocks,
} from "#utils/block-schema.js";

describe("BLOCK_DOCS shape", () => {
  // One test per block so the failure message identifies the broken module.
  for (const [blockType, docs] of Object.entries(BLOCK_DOCS)) {
    test(`${blockType}: docs expose a non-empty summary and params object`, () => {
      expect(typeof docs.summary).toBe("string");
      expect(docs.summary.length).toBeGreaterThan(0);
      expect(docs.params).toEqual(expect.any(Object));
    });
  }
});

describe("validateBlocks accepts every schema-declared key", () => {
  // Data-driven replacement for the per-block "allows all valid keys for X"
  // tests. If a block schema drops a legitimate key, the corresponding
  // test case here will fail and name the block.
  for (const [blockType, allowedKeys] of Object.entries(BLOCK_SCHEMAS)) {
    test(`${blockType}: block with every schema key validates`, () => {
      const block = { type: blockType };
      for (const key of allowedKeys) block[key] = "test-value";
      expect(() => validateBlocks([block])).not.toThrow();
    });
  }
});

describe("validateBlocks accepts common wrapper keys on every block", () => {
  // Data-driven: `dark` is injected by the wrapper template, so it must
  // be accepted on every block type regardless of its own schema.
  for (const blockType of Object.keys(BLOCK_SCHEMAS)) {
    test(`${blockType}: dark accepted`, () => {
      const block = { type: blockType, dark: true };
      expect(() => validateBlocks([block])).not.toThrow();
    });
  }
});

describe("validateBlocks error handling", () => {
  test("accepts an empty blocks array", () => {
    expect(() => validateBlocks([])).not.toThrow();
  });

  test("accepts a block with only a type (empty schema)", () => {
    // Blocks like "content" and "properties" have an empty schema.
    // Pick one dynamically so the test doesn't break if the list changes.
    const emptySchemaType = Object.entries(BLOCK_SCHEMAS).find(
      ([, keys]) => keys.length === 0,
    )?.[0];
    expect(emptySchemaType).toBeDefined();
    expect(() => validateBlocks([{ type: emptySchemaType }])).not.toThrow();
  });

  test("throws when a block is missing its type field", () => {
    expect(() => validateBlocks([{ title: "Hello" }])).toThrow(
      'missing required "type" field',
    );
  });

  test("throws when a block uses an unknown type", () => {
    expect(() => validateBlocks([{ type: "unknown-type" }])).toThrow(
      'Unknown block type "unknown-type"',
    );
  });

  test("throws when a block has an unknown key and lists allowed keys", () => {
    const blocks = [{ type: "video-background", video_url: "bad" }];
    expect(() => validateBlocks(blocks)).toThrow('unknown keys: "video_url"');
    expect(() => validateBlocks(blocks)).toThrow("Allowed keys:");
  });

  test("lists every unknown key when multiple are present", () => {
    const blocks = [{ type: "stats", foo: "bar", baz: "qux" }];
    expect(() => validateBlocks(blocks)).toThrow('"foo"');
    expect(() => validateBlocks(blocks)).toThrow('"baz"');
  });

  test("reports the offending block index (1-based) in error messages", () => {
    const blocks = [
      { type: "section-header", intro: "## Hello" },
      { type: "video-background", video_url: "bad" },
    ];
    expect(() => validateBlocks(blocks)).toThrow("block 2");
  });

  test("appends caller-supplied context to the error message", () => {
    const blocks = [{ type: "video-background", video_url: "bad" }];
    expect(() => validateBlocks(blocks, " in test-file.html")).toThrow(
      "in test-file.html",
    );
  });

  test("rejects keys borrowed from a sibling block variant", () => {
    // split-callout and split-image share a base but diverge: figure_src
    // belongs to split-image, not split-callout. This guards against
    // cross-variant key leaks.
    const blocks = [{ type: "split-callout", figure_src: "/img.jpg" }];
    expect(() => validateBlocks(blocks)).toThrow('unknown keys: "figure_src"');
  });

  test("accepts dark boolean on any block", () => {
    for (const dark of [true, false]) {
      const blocks = [{ type: "section-header", intro: "x", dark }];
      expect(() => validateBlocks(blocks)).not.toThrow();
    }
  });

  test("rejects removed container_width key", () => {
    const blocks = [
      { type: "section-header", intro: "x", container_width: "wide" },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'unknown keys: "container_width"',
    );
  });

  test("rejects removed section_class key", () => {
    const blocks = [
      { type: "section-header", intro: "x", section_class: "dark" },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'unknown keys: "section_class"',
    );
  });
});

describe("getBlockContainerWidth", () => {
  test("defaults to wide for blocks without an explicit width", () => {
    expect(getBlockContainerWidth("markdown")).toBe("wide");
    expect(getBlockContainerWidth("features")).toBe("wide");
    expect(getBlockContainerWidth("section-header")).toBe("wide");
  });

  test("returns full for image and video background blocks", () => {
    for (const type of [
      "video-background",
      "bunny-video-background",
      "image-background",
      "marquee-images",
      "hero",
      "split-full",
    ]) {
      expect(getBlockContainerWidth(type)).toBe("full");
    }
  });

  test("returns narrow for icon-links", () => {
    expect(getBlockContainerWidth("icon-links")).toBe("narrow");
  });

  test("defaults unknown block types to wide", () => {
    expect(getBlockContainerWidth("not-a-real-block")).toBe("wide");
  });
});
