import { describe, expect, test } from "vitest";
import eleventyComputed from "#data/eleventyComputed.js";
import { BLOCK_EXAMPLES } from "#utils/block-schema.js";

const page = { inputPath: "test.html" };
const name = "Test Item";

/** Run the blocks computed against a single block and return the processed block. */
const runSingle = async (block) =>
  (await eleventyComputed.blocks({ blocks: [block], page, name }))[0];

describe("eleventyComputed.blocks", () => {
  test("returns undefined when blocks is not set", async () => {
    expect(await eleventyComputed.blocks({ page, name })).toBeUndefined();
  });

  test("adds the 'dark: false' default to a minimal markdown block", async () => {
    expect(await runSingle({ type: "markdown", content: "test" })).toEqual({
      type: "markdown",
      content: "test",
      dark: false,
    });
  });

  test("applies defaults without mutating source blocks", async () => {
    const block = Object.freeze({ type: "stats", items: [] });
    const blocks = Object.freeze([block]);
    const result = await eleventyComputed.blocks({ blocks, page, name });
    expect(result).toEqual([
      { type: "stats", items: [], reveal: true, dark: false },
    ]);
    expect(result[0]).not.toBe(block);
  });

  test("throws on unknown block types", async () => {
    await expect(
      runSingle({ type: "unknown-type", content: "test" }),
    ).rejects.toThrow('Unknown block type "unknown-type"');
  });

  test("throws when a block contains unknown keys", async () => {
    await expect(
      runSingle({ type: "markdown", content: "Valid", video_url: "bad" }),
    ).rejects.toThrow('unknown keys: "video_url"');
  });

  test("includes inputPath in thrown validation errors", async () => {
    await expect(
      eleventyComputed.blocks({
        blocks: [{ type: "unknown-type" }],
        name,
        page: { inputPath: "src/pages/example.md" },
      }),
    ).rejects.toThrow("src/pages/example.md");
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
    expect(
      await runSingle({
        type: "split-image",
        content: "## Section Heading",
        figure_src: "/images/example.jpg",
      }),
    ).toEqual({
      type: "split-image",
      content: "## Section Heading",
      figure_src: "/images/example.jpg",
      reverse: false,
      reveal_figure: "scale",
      reveal_content: "left",
      dark: false,
    });
  });

  test("sets reveal_content to 'right' when a split block is reversed", async () => {
    const block = await runSingle({
      type: "split-html",
      content: "## Section Heading",
      figure_html: "<p>Figure</p>",
      reverse: true,
    });
    expect(block.reveal_content).toBe("right");
  });

  test("preserves an explicit reveal_content on a split block", async () => {
    const block = await runSingle({
      type: "split-code",
      content: "## Section Heading",
      figure_code: "const example = true;",
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

  test("fills nested button defaults per block, keeping authored values", async () => {
    const cta = await runSingle({
      type: "cta",
      content: "## Go",
      button: { text: "Go", href: "/go/" },
    });
    expect(cta.button).toEqual({
      text: "Go",
      href: "/go/",
      variant: "secondary",
      size: "lg",
    });

    const hero = await runSingle({
      type: "hero",
      content: "# Hi",
      buttons: [
        { text: "A", href: "/a/" },
        { text: "B", href: "/b/", variant: "ghost" },
      ],
    });
    expect(hero.buttons.map(({ variant }) => variant)).toEqual([
      "primary",
      "ghost",
    ]);
  });

  test("leaves split-full without the split-figure reveal fields", async () => {
    const block = await runSingle({ type: "split-full", left_content: "L" });
    expect(block).not.toHaveProperty("reveal_content");
    expect(block).not.toHaveProperty("reveal_figure");
  });

  test("allows user values to override default values", async () => {
    const block = await runSingle({
      type: "features",
      items: [],
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
      name,
      page,
    });
    expect(result[0].reveal).toBe(true);
    expect(result[1].reveal).toBe(true);
  });
});

describe("eleventyComputed.blocks block gallery", () => {
  test("a block_gallery page builds its blocks from the canonical examples", async () => {
    const blocks = await eleventyComputed.blocks({
      block_gallery: true,
      page,
      name,
    });

    // Hero, then two blocks per type: a YAML source with an intro title and
    // the live example.
    expect(blocks.length).toBe(1 + 2 * BLOCK_EXAMPLES.length);
    expect(blocks[0].type).toBe("hero");
    // Defaults are applied to the generated blocks like any others
    expect(blocks.every((block) => "dark" in block)).toBe(true);
  });
});

describe("eleventyComputed.blocks item and block validation", () => {
  test("passes when a tagged item has a name and valid blocks", async () => {
    await expect(
      eleventyComputed.blocks({
        blocks: [{ type: "markdown", content: "Hello" }],
        name,
        tags: ["pages"],
        page,
      }),
    ).resolves.toBeDefined();
  });

  test("does not throw for untagged utility templates without name", async () => {
    await expect(
      eleventyComputed.blocks({ subtitle: "utility page", page }),
    ).resolves.toBeUndefined();
  });

  test("throws with the page path in the message when a tagged item is missing its name", async () => {
    await expect(
      eleventyComputed.blocks({
        tags: ["pages"],
        subtitle: "No name",
        page: { inputPath: "src/pages/test.md" },
      }),
    ).rejects.toThrow(/missing required "name" field[\s\S]*test\.md/);
  });

  test("throws when a nested block item is missing a required field", async () => {
    await expect(
      eleventyComputed.blocks({
        blocks: [{ type: "features", items: [{ icon: "star" }] }],
        name,
        tags: ["pages"],
        page,
      }),
    ).rejects.toThrow('"features"');
  });

  test("throws every missing nested field from the shared schema", async () => {
    await expect(
      eleventyComputed.blocks({
        blocks: [{ type: "downloads", items: [{}] }],
        name,
        tags: ["pages"],
        page,
      }),
    ).rejects.toThrow(/required "file"[\s\S]*required "label"/);
  });

  test("throws item and block errors together when several names are missing", async () => {
    await expect(
      eleventyComputed.blocks({
        tags: ["pages"],
        blocks: [
          { type: "features", items: [{ description: "no name" }] },
          { type: "image-cards", items: [{ image: "/a.jpg" }] },
        ],
        page,
      }),
    ).rejects.toThrow(
      /Item is missing required[\s\S]*"features"[\s\S]*"image-cards"/,
    );
  });
});
