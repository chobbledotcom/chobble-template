import { describe, expect, test } from "bun:test";
import {
  BLOCK_SCHEMAS,
  validateBlock,
  validateBlocks,
} from "#utils/block-schema.js";

describe("BLOCK_SCHEMAS", () => {
  test("defines schemas for all block types", () => {
    const expectedTypes = [
      "section-header",
      "features",
      "image-cards",
      "stats",
      "code-block",
      "hero",
      "split",
      "cta",
      "footer",
      "video-background",
      "markdown",
      "html",
    ];
    expect(Object.keys(BLOCK_SCHEMAS).sort()).toEqual(expectedTypes.sort());
  });

  test("video-background schema includes video_id", () => {
    expect(BLOCK_SCHEMAS["video-background"]).toContain("video_id");
  });

  test("video-background schema does not include video_url", () => {
    expect(BLOCK_SCHEMAS["video-background"]).not.toContain("video_url");
  });
});

describe("validateBlock", () => {
  test("accepts valid block with known type and keys", () => {
    const block = { type: "section-header", title: "Hello", subtitle: "World" };
    expect(() => validateBlock(block)).not.toThrow();
  });

  test("throws for block missing type", () => {
    const block = { title: "Hello" };
    expect(() => validateBlock(block)).toThrow('missing required "type" field');
  });

  test("throws for unknown block type", () => {
    const block = { type: "unknown-type", content: "test" };
    expect(() => validateBlock(block)).toThrow(
      'Unknown block type "unknown-type"',
    );
  });

  test("throws for unknown key with helpful message", () => {
    const block = {
      type: "video-background",
      video_url: "https://example.com",
    };
    expect(() => validateBlock(block)).toThrow('unknown keys: "video_url"');
    expect(() => validateBlock(block)).toThrow("Allowed keys:");
  });

  test("includes context in error message", () => {
    const block = { type: "video-background", video_url: "test" };
    expect(() => validateBlock(block, " in test-file.html")).toThrow(
      "in test-file.html",
    );
  });

  test("allows all valid keys for section-header", () => {
    const block = {
      type: "section-header",
      title: "Title",
      subtitle: "Subtitle",
      level: 2,
      align: "center",
      class: "custom",
    };
    expect(() => validateBlock(block)).not.toThrow();
  });

  test("allows all valid keys for video-background", () => {
    const block = {
      type: "video-background",
      video_id: "dQw4w9WgXcQ",
      video_title: "Video",
      content: "<h2>Test</h2>",
      aspect_ratio: "16/9",
      overlay_style: "opacity: 0.5",
      class: "custom",
    };
    expect(() => validateBlock(block)).not.toThrow();
  });

  test("allows all valid keys for split", () => {
    const block = {
      type: "split",
      title: "Title",
      title_level: 2,
      subtitle: "Subtitle",
      content: "<p>Content</p>",
      figure_type: "image",
      figure_content: { src: "/img.jpg", alt: "Alt" },
      reverse: true,
      reveal_content: "left",
      reveal_figure: "scale",
      button: { text: "Click", href: "/" },
    };
    expect(() => validateBlock(block)).not.toThrow();
  });

  test("reports multiple unknown keys", () => {
    const block = { type: "stats", foo: "bar", baz: "qux" };
    expect(() => validateBlock(block)).toThrow('"foo"');
    expect(() => validateBlock(block)).toThrow('"baz"');
  });
});

describe("validateBlocks", () => {
  test("validates all blocks in array", () => {
    const blocks = [
      { type: "section-header", title: "Hello" },
      { type: "stats", items: [] },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("throws with block index in error message", () => {
    const blocks = [
      { type: "section-header", title: "Hello" },
      { type: "video-background", video_url: "bad" },
    ];
    expect(() => validateBlocks(blocks)).toThrow("block 2");
  });

  test("includes context in error message", () => {
    const blocks = [{ type: "video-background", video_url: "bad" }];
    expect(() => validateBlocks(blocks, " in landing.html")).toThrow(
      "in landing.html",
    );
  });

  test("handles empty array", () => {
    expect(() => validateBlocks([])).not.toThrow();
  });
});
