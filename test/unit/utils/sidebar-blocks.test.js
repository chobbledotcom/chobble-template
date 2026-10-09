import { describe, expect, test } from "vitest";
import {
  splitHoistedBanner,
  validateSidebarBlocks,
} from "#utils/sidebar-blocks.js";

describe("validateSidebarBlocks", () => {
  test("returns column-safe blocks unchanged", () => {
    const blocks = [
      { type: "markdown", content: "Hello" },
      { type: "cta", content: "Call us" },
    ];
    expect(validateSidebarBlocks(blocks)).toEqual(blocks);
  });

  test("returns empty array for missing blocks", () => {
    expect(validateSidebarBlocks(undefined)).toEqual([]);
    expect(validateSidebarBlocks(null)).toEqual([]);
  });

  test.each([
    "hero",
    "image-background",
    "marquee-images",
    "split-full",
  ])("rejects full-width %s in the sidebar", (type) => {
    expect(() => validateSidebarBlocks([{ type }])).toThrow(
      `Block type "${type}" is not supported inside the right-content sidebar.`,
    );
  });

  test("throws for an unregistered type", () => {
    expect(() => validateSidebarBlocks([{ type: "video-background" }])).toThrow(
      'Unknown block type "video-background"',
    );
  });

  test("throws for split-* types", () => {
    expect(() => validateSidebarBlocks([{ type: "split-callout" }])).toThrow(
      'Block type "split-callout" is not supported inside the right-content sidebar.',
    );
  });
});

describe("splitHoistedBanner", () => {
  const banner = { type: "image-background", image: "x.jpg" };
  const markdown = { type: "markdown", content: "Hello" };

  test("hoists a leading image-background when sidebar is active", () => {
    const { banner: hoisted, rest } = splitHoistedBanner(
      [banner, markdown],
      true,
    );
    expect(hoisted).toEqual([banner]);
    expect(rest).toEqual([markdown]);
  });

  test("does not hoist when sidebar is inactive", () => {
    const blocks = [banner, markdown];
    expect(splitHoistedBanner(blocks, false)).toEqual({
      banner: [],
      rest: blocks,
    });
  });

  test("does not hoist a non-leading image-background", () => {
    const blocks = [markdown, banner];
    expect(splitHoistedBanner(blocks, true)).toEqual({
      banner: [],
      rest: blocks,
    });
  });

  test("handles missing blocks", () => {
    expect(splitHoistedBanner(undefined, true)).toEqual({
      banner: [],
      rest: [],
    });
  });
});
