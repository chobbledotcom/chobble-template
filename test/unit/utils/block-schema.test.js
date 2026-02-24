import { describe, expect, test } from "bun:test";
import { BLOCK_SCHEMAS, validateBlocks } from "#utils/block-schema.js";

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
      "split-full",
      "cta",
      "video-background",
      "image-background",
      "items",
      "contact_form",
      "markdown",
      "html",
      "content",
      "include",
      "properties",
      "guide-categories",
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

describe("validateBlocks", () => {
  test("accepts valid block with known type and keys", () => {
    const blocks = [
      { type: "section-header", title: "Hello", subtitle: "World" },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("throws for block missing type", () => {
    const blocks = [{ title: "Hello" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'missing required "type" field',
    );
  });

  test("throws for unknown block type", () => {
    const blocks = [{ type: "unknown-type", content: "test" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Unknown block type "unknown-type"',
    );
  });

  test("throws for unknown key with helpful message", () => {
    const blocks = [
      {
        type: "video-background",
        video_url: "https://example.com",
      },
    ];
    expect(() => validateBlocks(blocks)).toThrow('unknown keys: "video_url"');
    expect(() => validateBlocks(blocks)).toThrow("Allowed keys:");
  });

  test("includes context in error message", () => {
    const blocks = [{ type: "video-background", video_url: "test" }];
    expect(() => validateBlocks(blocks, " in test-file.html")).toThrow(
      "in test-file.html",
    );
  });

  test("allows all valid keys for section-header", () => {
    const blocks = [
      {
        type: "section-header",
        title: "Title",
        subtitle: "Subtitle",
        level: 2,
        align: "center",
        class: "custom",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for video-background", () => {
    const blocks = [
      {
        type: "video-background",
        video_id: "dQw4w9WgXcQ",
        video_title: "Video",
        content: "<h2>Test</h2>",
        aspect_ratio: "16/9",
        class: "custom",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for split with image figure", () => {
    const blocks = [
      {
        type: "split",
        title: "Title",
        title_level: 2,
        subtitle: "Subtitle",
        content: "<p>Content</p>",
        figure_type: "image",
        figure_src: "/img.jpg",
        figure_alt: "Alt",
        figure_caption: "Caption",
        reverse: true,
        reveal_content: "left",
        reveal_figure: "scale",
        button: { text: "Click", href: "/" },
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for split with video figure", () => {
    const blocks = [
      {
        type: "split",
        figure_type: "video",
        figure_video_id: "dQw4w9WgXcQ",
        figure_alt: "Video title",
        figure_caption: "A video",
        content: "<p>Content</p>",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for split with code figure", () => {
    const blocks = [
      {
        type: "split",
        figure_type: "code",
        figure_filename: "example.js",
        figure_code: "const x = 1;",
        figure_language: "javascript",
        content: "<p>Content</p>",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for split with html figure", () => {
    const blocks = [
      {
        type: "split",
        figure_type: "html",
        figure_html: "<div>Custom HTML</div>",
        content: "<p>Content</p>",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("rejects old figure_content key on split", () => {
    const blocks = [
      {
        type: "split",
        figure_type: "image",
        figure_content: { src: "/img.jpg", alt: "Alt" },
        content: "<p>Content</p>",
      },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'unknown keys: "figure_content"',
    );
  });

  test("allows all valid keys for split-full", () => {
    const blocks = [
      {
        type: "split-full",
        variant: "dark-left",
        title_level: 2,
        left_title: "Left",
        left_content: "<p>Left content</p>",
        left_button: { text: "Click", href: "/" },
        right_title: "Right",
        right_content: "<p>Right content</p>",
        right_button: { text: "Click", href: "/" },
        reveal_left: "left",
        reveal_right: "right",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("allows all valid keys for contact_form with headers", () => {
    const blocks = [
      {
        type: "contact_form",
        content: "Get in touch",
        header_title: "Contact Us",
        header_subtitle: "We'd love to hear from you",
        header_level: 2,
        header_align: "center",
        header_class: "custom",
      },
    ];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("reports multiple unknown keys", () => {
    const blocks = [{ type: "stats", foo: "bar", baz: "qux" }];
    expect(() => validateBlocks(blocks)).toThrow('"foo"');
    expect(() => validateBlocks(blocks)).toThrow('"baz"');
  });

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

  test("handles empty array", () => {
    expect(() => validateBlocks([])).not.toThrow();
  });
});
