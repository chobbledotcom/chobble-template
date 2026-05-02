import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";
import { getVideoThumbnailUrl } from "#utils/video.js";

const page = { inputPath: "test.html" };

/** Run the blocks computed against a single block and return the processed block. */
const runSingle = async (block) =>
  (await eleventyComputed.blocks({ blocks: [block], page }))[0];

describe("eleventyComputed.blocks", () => {
  test("returns undefined when blocks is not set", async () => {
    expect(await eleventyComputed.blocks({ page })).toBeUndefined();
  });

  test("adds the 'dark: false' default to a minimal markdown block", async () => {
    expect(await runSingle({ type: "markdown", content: "test" })).toEqual({
      type: "markdown",
      content: "test",
      dark: false,
    });
  });

  test("throws on unknown block types", async () => {
    expect(
      runSingle({ type: "unknown-type", content: "test" }),
    ).rejects.toThrow('Unknown block type "unknown-type"');
  });

  test("throws when a block contains unknown keys", async () => {
    expect(
      runSingle({ type: "video-background", video_url: "bad" }),
    ).rejects.toThrow('unknown keys: "video_url"');
  });

  test("includes inputPath in thrown validation errors", async () => {
    expect(
      eleventyComputed.blocks({
        blocks: [{ type: "unknown-type" }],
        page: { inputPath: "src/products/example.md" },
      }),
    ).rejects.toThrow("src/products/example.md");
  });

  test("applies the features defaults (reveal, center)", async () => {
    expect(await runSingle({ type: "features", items: [] })).toEqual({
      type: "features",
      items: [],
      reveal: true,
      center: false,
      dark: false,
    });
  });

  test("applies the stats defaults (reveal only)", async () => {
    expect(await runSingle({ type: "stats", items: [] })).toEqual({
      type: "stats",
      items: [],
      reveal: true,
      dark: false,
    });
  });

  test("applies split-image defaults including reveal_content 'left'", async () => {
    expect(await runSingle({ type: "split-image", title: "Test" })).toEqual({
      type: "split-image",
      title: "Test",
      title_level: 2,
      reveal_figure: "scale",
      reveal_content: "left",
      dark: false,
    });
  });

  test("sets reveal_content to 'right' when a split block is reversed", async () => {
    const block = await runSingle({
      type: "split-html",
      title: "Test",
      reverse: true,
    });
    expect(block.reveal_content).toBe("right");
  });

  test("preserves an explicit reveal_content on a split block", async () => {
    const block = await runSingle({
      type: "split-code",
      title: "Test",
      reveal_content: "left",
    });
    expect(block.reveal_content).toBe("left");
  });

  test("applies the section-header defaults (align: center)", async () => {
    expect(
      await runSingle({ type: "section-header", intro: "## Header" }),
    ).toEqual({
      type: "section-header",
      intro: "## Header",
      align: "center",
      dark: false,
    });
  });

  test("applies the image-cards defaults (reveal)", async () => {
    expect(await runSingle({ type: "image-cards", items: [] })).toEqual({
      type: "image-cards",
      items: [],
      reveal: true,
      dark: false,
    });
  });

  test("applies the code-block defaults (reveal)", async () => {
    expect(
      await runSingle({
        type: "code-block",
        code: "test",
        filename: "test.js",
      }),
    ).toEqual({
      type: "code-block",
      code: "test",
      filename: "test.js",
      reveal: true,
      dark: false,
    });
  });

  test("allows user values to override default values", async () => {
    const block = await runSingle({
      type: "features",
      reveal: false,
      center: true,
    });
    expect(block.reveal).toBe(false);
    expect(block.center).toBe(true);
  });

  test("allows user to override the dark default to true", async () => {
    const block = await runSingle({ type: "stats", items: [], dark: true });
    expect(block.dark).toBe(true);
  });

  test("applies per-type defaults across a list of mixed blocks", async () => {
    const result = await eleventyComputed.blocks({
      blocks: [
        { type: "stats", items: [] },
        { type: "code-block", code: "x", filename: "x.js" },
      ],
      page,
    });
    expect(result[0].reveal).toBe(true);
    expect(result[1].reveal).toBe(true);
  });

  test("enriches video-cards block videos with thumbnail_url", async () => {
    const id = "dQw4w9WgXcQ";
    const block = await runSingle({
      type: "video-cards",
      videos: [{ id, title: "Test" }],
    });
    expect(block.videos[0].thumbnail_url).toBe(await getVideoThumbnailUrl(id));
    expect(block.videos[0].title).toBe("Test");
  });

  test("leaves a video-cards block alone when its videos field is missing", async () => {
    const block = await runSingle({ type: "video-cards", videos: undefined });
    expect(block.videos).toBeUndefined();
  });
});
