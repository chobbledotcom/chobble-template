import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

const page = { inputPath: "test.html" };

/** Run the blocks computed against a single block and return the processed block. */
const runSingle = (block) =>
  eleventyComputed.blocks({ blocks: [block], page })[0];

describe("eleventyComputed.blocks", () => {
  test("returns undefined when blocks is not set", () => {
    expect(eleventyComputed.blocks({ page })).toBeUndefined();
  });

  test("adds the 'dark: false' default to a minimal markdown block", () => {
    expect(runSingle({ type: "markdown", content: "test" })).toEqual({
      type: "markdown",
      content: "test",
      dark: false,
    });
  });

  test("throws on unknown block types", () => {
    expect(() => runSingle({ type: "unknown-type", content: "test" })).toThrow(
      'Unknown block type "unknown-type"',
    );
  });

  test("throws when a block contains unknown keys", () => {
    expect(() =>
      runSingle({ type: "video-background", video_url: "bad" }),
    ).toThrow('unknown keys: "video_url"');
  });

  test("includes inputPath in thrown validation errors", () => {
    expect(() =>
      eleventyComputed.blocks({
        blocks: [{ type: "unknown-type" }],
        page: { inputPath: "src/products/example.md" },
      }),
    ).toThrow("src/products/example.md");
  });

  test("applies the features defaults (reveal, heading_level, grid_class)", () => {
    expect(runSingle({ type: "features", items: [] })).toEqual({
      type: "features",
      items: [],
      reveal: true,
      heading_level: 3,
      grid_class: "features",
      dark: false,
    });
  });

  test("applies the stats defaults (reveal only)", () => {
    expect(runSingle({ type: "stats", items: [] })).toEqual({
      type: "stats",
      items: [],
      reveal: true,
      dark: false,
    });
  });

  test("applies split-image defaults including reveal_content 'left'", () => {
    expect(runSingle({ type: "split-image", title: "Test" })).toEqual({
      type: "split-image",
      title: "Test",
      title_level: 2,
      reveal_figure: "scale",
      reveal_content: "left",
      dark: false,
    });
  });

  test("sets reveal_content to 'right' when a split block is reversed", () => {
    const block = runSingle({
      type: "split-html",
      title: "Test",
      reverse: true,
    });
    expect(block.reveal_content).toBe("right");
  });

  test("preserves an explicit reveal_content on a split block", () => {
    const block = runSingle({
      type: "split-code",
      title: "Test",
      reveal_content: "left",
    });
    expect(block.reveal_content).toBe("left");
  });

  test("applies the section-header defaults (align: center)", () => {
    expect(runSingle({ type: "section-header", intro: "## Header" })).toEqual({
      type: "section-header",
      intro: "## Header",
      align: "center",
      dark: false,
    });
  });

  test("applies the image-cards defaults (reveal, heading_level)", () => {
    expect(runSingle({ type: "image-cards", items: [] })).toEqual({
      type: "image-cards",
      items: [],
      reveal: true,
      heading_level: 3,
      dark: false,
    });
  });

  test("applies the code-block defaults (reveal)", () => {
    expect(
      runSingle({ type: "code-block", code: "test", filename: "test.js" }),
    ).toEqual({
      type: "code-block",
      code: "test",
      filename: "test.js",
      reveal: true,
      dark: false,
    });
  });

  test("applies the video-background defaults (aspect_ratio)", () => {
    expect(
      runSingle({
        type: "video-background",
        video_id: "dQw4w9WgXcQ",
        content: "<h2>Test</h2>",
      }),
    ).toEqual({
      type: "video-background",
      video_id: "dQw4w9WgXcQ",
      content: "<h2>Test</h2>",
      aspect_ratio: "16/9",
      dark: false,
    });
  });

  test("allows user values to override default values", () => {
    const block = runSingle({
      type: "features",
      reveal: false,
      heading_level: 2,
    });
    expect(block.reveal).toBe(false);
    expect(block.heading_level).toBe(2);
    // grid_class default is still applied because it is not overridden
    expect(block.grid_class).toBe("features");
  });

  test("allows user to override the dark default to true", () => {
    const block = runSingle({ type: "stats", items: [], dark: true });
    expect(block.dark).toBe(true);
  });

  test("applies per-type defaults across a list of mixed blocks", () => {
    const result = eleventyComputed.blocks({
      blocks: [
        { type: "stats", items: [] },
        { type: "code-block", code: "x", filename: "x.js" },
      ],
      page,
    });
    expect(result[0].reveal).toBe(true);
    expect(result[1].reveal).toBe(true);
  });
});
