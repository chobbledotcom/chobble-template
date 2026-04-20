import { describe, expect, test } from "bun:test";
import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";

const block = (type, extra = {}) => ({ type, ...extra });

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

    test("subsequent blocks of the same type fall through to rest", () => {
      const blocks = [
        block("markdown", { id: "m1" }),
        block("markdown", { id: "m2" }),
        block("markdown", { id: "m3" }),
      ];
      const layout = { columns: [{ types: ["markdown"] }] };

      const result = splitBlocksForColumns(blocks, layout);

      expect(result.columns).toEqual([[blocks[0]]]);
      expect(result.rest).toEqual([blocks[1], blocks[2]]);
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

    test("throws when two columns share a type", () => {
      const layout = {
        columns: [{ types: ["markdown"] }, { types: ["markdown"] }],
      };
      expect(() => splitBlocksForColumns([block("markdown")], layout)).toThrow(
        /multiple columns/,
      );
    });

    test("allows columns with partial matches, unmatched column ends up empty", () => {
      const blocks = [block("markdown", { id: "m1" })];
      const result = splitBlocksForColumns(blocks, galleryMarkdownLayout);

      expect(result.columns).toEqual([[], [blocks[0]]]);
      expect(result.rest).toEqual([]);
    });
  });
});
