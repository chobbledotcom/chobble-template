import { describe, expect, test } from "bun:test";
import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";

const block = (type, extra = {}) => ({ type, ...extra });
const md = (id) => block("markdown", { id });

const withLayout = (types) => ({ columns: [{ types }] });

describe("block-columns", () => {
  describe("disallowed block types", () => {
    test("rejects split-* types with a clear error", () => {
      const layout = withLayout(["split-image"]);
      expect(() =>
        splitBlocksForColumns([block("split-image")], layout),
      ).toThrow(/"split-image".*not supported/);
    });

    test("rejects hero", () => {
      expect(() =>
        splitBlocksForColumns([block("hero")], withLayout(["hero"])),
      ).toThrow(/"hero".*not supported/);
    });

    test("rejects background-variants", () => {
      for (const type of [
        "video-background",
        "bunny-video-background",
        "image-background",
        "marquee-images",
      ]) {
        expect(() =>
          splitBlocksForColumns([block(type)], withLayout([type])),
        ).toThrow(new RegExp(`"${type}".*not supported`));
      }
    });

    test("allows standard flow types without throwing", () => {
      for (const type of ["markdown", "gallery", "buy-options", "features"]) {
        expect(() =>
          splitBlocksForColumns([block(type)], withLayout([type])),
        ).not.toThrow();
      }
    });
  });

  describe("getLayoutForTags", () => {
    const layouts = {
      products: { columns: [{ types: ["gallery"] }] },
      properties: { columns: [{ types: ["markdown"] }] },
    };

    test("returns matching layout for the first matching tag", () => {
      expect(getLayoutForTags(["product", "products"], layouts)).toBe(
        layouts.products,
      );
    });

    test("returns first match when multiple tags match", () => {
      expect(getLayoutForTags(["properties", "products"], layouts)).toBe(
        layouts.properties,
      );
    });

    test("returns null when no tag matches", () => {
      expect(getLayoutForTags(["news"], layouts)).toBeNull();
    });

    test("returns null for undefined inputs", () => {
      expect(getLayoutForTags(undefined, layouts)).toBeNull();
      expect(getLayoutForTags(["products"], undefined)).toBeNull();
    });

    test("ignores entries that are not layout objects", () => {
      const mixed = {
        _comment: "documentation string",
        products: { columns: [{ types: ["gallery"] }] },
      };
      expect(getLayoutForTags(["_comment"], mixed)).toBeNull();
      expect(getLayoutForTags(["products"], mixed)).toBe(mixed.products);
    });
  });

  describe("splitBlocksForColumns", () => {
    const galleryMarkdownLayout = {
      columns: [{ types: ["gallery"] }, { types: ["markdown"] }],
    };

    test("places first block of each listed type into its column", () => {
      const blocks = [
        block("gallery", { id: "g1" }),
        block("markdown", { id: "m1" }),
        block("buy-options", { id: "b1" }),
        block("features", { id: "f1" }),
      ];
      const layout = {
        columns: [
          { types: ["gallery"] },
          { types: ["markdown", "buy-options", "features"] },
        ],
      };

      const result = splitBlocksForColumns(blocks, layout);

      expect(result.columns).toEqual([
        [blocks[0]],
        [blocks[1], blocks[2], blocks[3]],
      ]);
      expect(result.rest).toEqual([]);
    });

    test("blocks of the same type beyond the queue length fall through to rest", () => {
      const blocks = [md("m1"), md("m2"), md("m3")];
      const layout = { columns: [{ types: ["markdown"] }] };

      const result = splitBlocksForColumns(blocks, layout);

      expect(result.columns).toEqual([[blocks[0]]]);
      expect(result.rest).toEqual([blocks[1], blocks[2]]);
    });

    test("listing a type twice in one column claims two blocks", () => {
      const blocks = [md("m1"), block("cta", { id: "c1" }), md("m2"), md("m3")];
      const layout = {
        columns: [{ types: ["markdown", "cta", "markdown"] }],
      };

      const result = splitBlocksForColumns(blocks, layout);

      // Slots consume in order: m1, c1, m2. Within the column, blocks appear
      // in slot order (not block order).
      expect(result.columns).toEqual([[blocks[0], blocks[1], blocks[2]]]);
      expect(result.rest).toEqual([blocks[3]]);
    });

    test("a type listed across columns claims one block per column in order", () => {
      const [first, second, third] = [md("m1"), md("m2"), md("m3")];
      const result = splitBlocksForColumns([first, second, third], {
        columns: [{ types: ["markdown"] }, { types: ["markdown"] }],
      });

      expect(result.columns).toEqual([[first], [second]]);
      expect(result.rest).toEqual([third]);
    });

    test("unmatched types go to rest preserving original order", () => {
      const blocks = [
        block("cta", { id: "c1" }),
        block("gallery", { id: "g1" }),
        block("stats", { id: "s1" }),
        block("markdown", { id: "m1" }),
        block("callout", { id: "ca1" }),
      ];
      const result = splitBlocksForColumns(blocks, galleryMarkdownLayout);

      expect(result.columns).toEqual([[blocks[1]], [blocks[3]]]);
      expect(result.rest).toEqual([blocks[0], blocks[2], blocks[4]]);
    });

    test("returns null columns when no blocks match the layout", () => {
      const blocks = [block("cta"), block("stats")];
      const result = splitBlocksForColumns(blocks, galleryMarkdownLayout);

      expect(result.columns).toBeNull();
      expect(result.rest).toEqual(blocks);
    });

    test("returns null columns when layout is null", () => {
      const blocks = [block("markdown")];
      const result = splitBlocksForColumns(blocks, null);
      expect(result.columns).toBeNull();
      expect(result.rest).toEqual(blocks);
    });

    test("handles undefined blocks gracefully", () => {
      const layout = { columns: [{ types: ["markdown"] }] };
      const result = splitBlocksForColumns(undefined, layout);
      expect(result.columns).toBeNull();
      expect(result.rest).toEqual([]);
    });

    test("throws when a column lists a disallowed type", () => {
      const layout = {
        columns: [{ types: ["hero"] }, { types: ["markdown"] }],
      };
      expect(() => splitBlocksForColumns([block("markdown")], layout)).toThrow(
        /not supported/,
      );
    });

    test("allows columns with partial matches, unmatched column ends up empty", () => {
      const blocks = [block("markdown", { id: "m1" })];
      const result = splitBlocksForColumns(blocks, galleryMarkdownLayout);

      expect(result.columns).toEqual([[], [blocks[0]]]);
      expect(result.rest).toEqual([]);
    });

    test("defaults before to an empty array when no layout applies", () => {
      const blocks = [block("markdown")];
      const result = splitBlocksForColumns(blocks, null);
      expect(result.before).toEqual([]);
    });
  });

  describe("before queue", () => {
    const withHero = (cols) => ({ before: ["hero"], columns: cols });
    const galleryMdCols = [{ types: ["gallery"] }, { types: ["markdown"] }];
    const expectSplitResult = (result, before, columns, rest) => {
      expect(result.before).toEqual(before);
      expect(result.columns).toEqual(columns);
      expect(result.rest).toEqual(rest);
    };

    test("claims listed types full-width above the columns section", () => {
      const blocks = [block("hero"), block("gallery"), block("markdown")];
      const result = splitBlocksForColumns(blocks, withHero(galleryMdCols));

      expectSplitResult(result, [blocks[0]], [[blocks[1]], [blocks[2]]], []);
    });

    test("renders before blocks in slot order, not page order", () => {
      const blocks = [block("markdown"), block("hero"), block("cta")];
      const result = splitBlocksForColumns(blocks, {
        before: ["hero", "markdown"],
      });

      // 'hero' slot claims blocks[1], 'markdown' slot claims blocks[0].
      expect(result.before).toEqual([blocks[1], blocks[0]]);
      expect(result.rest).toEqual([blocks[2]]);
    });

    test("before claims a block before columns get a chance at it", () => {
      const blocks = [block("markdown"), block("markdown"), block("markdown")];
      const result = splitBlocksForColumns(blocks, {
        before: ["markdown"],
        columns: [{ types: ["markdown"] }],
      });

      expectSplitResult(result, [blocks[0]], [[blocks[1]]], [blocks[2]]);
    });

    test("listing a type twice in before claims two blocks of that type", () => {
      const blocks = [block("markdown"), block("cta"), block("markdown")];
      const result = splitBlocksForColumns(blocks, {
        before: ["markdown", "markdown"],
      });

      expect(result.before).toEqual([blocks[0], blocks[2]]);
      expect(result.rest).toEqual([blocks[1]]);
    });

    test("allows full-width types inside before that are banned in columns", () => {
      const fullWidthTypes = [
        "hero",
        "video-background",
        "bunny-video-background",
        "image-background",
        "marquee-images",
        "split-image",
      ];
      for (const type of fullWidthTypes) {
        expect(() =>
          splitBlocksForColumns([block(type)], { before: [type] }),
        ).not.toThrow();
      }
    });

    test("unmatched before types leave columns and rest unaffected", () => {
      const blocks = [block("gallery"), block("markdown")];
      const result = splitBlocksForColumns(blocks, withHero(galleryMdCols));

      expectSplitResult(result, [], [[blocks[0]], [blocks[1]]], []);
    });

    test.each([
      ["layout has only before", { before: ["hero"] }],
      ["columns have no matches", withHero([{ types: ["gallery"] }])],
    ])("before still claims when %s", (_label, layout) => {
      const blocks = [block("hero"), block("markdown")];
      const result = splitBlocksForColumns(blocks, layout);

      expect(result.before).toEqual([blocks[0]]);
      expect(result.columns).toBeNull();
      expect(result.rest).toEqual([blocks[1]]);
    });
  });

  describe("getLayoutForTags with before-only layouts", () => {
    test("accepts a layout with only a before key", () => {
      const layouts = { products: { before: ["hero"] } };
      expect(getLayoutForTags(["products"], layouts)).toBe(layouts.products);
    });

    test("still rejects objects with neither key", () => {
      const layouts = { products: { other: "value" } };
      expect(getLayoutForTags(["products"], layouts)).toBeNull();
    });
  });
});
