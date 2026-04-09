import { describe, expect, test } from "bun:test";
import {
  extractLqipFromMetadata,
  getEleventyImg,
  LQIP_WIDTH,
  removeLqip,
  shouldGenerateLqip,
} from "#media/image-lqip.js";
import { fs, path, withTempDirAsync, withTempFile } from "#test/test-utils.js";

describe("image-lqip", () => {
  describe("getEleventyImg", () => {
    test("returns the eleventy-img module", async () => {
      const mod = await getEleventyImg();
      expect(mod).toBeDefined();
    });
  });

  describe("extractLqipFromMetadata", () => {
    test("returns null when webp key is absent", async () => {
      const result = await extractLqipFromMetadata({});
      expect(result).toBeNull();
    });

    test("returns null when no webp image matches LQIP_WIDTH", async () => {
      const result = await extractLqipFromMetadata({
        webp: [{ width: 800, outputPath: "/some/path.webp" }],
      });
      expect(result).toBeNull();
    });

    test("returns base64 data URL for matching LQIP_WIDTH image", () =>
      withTempDirAsync("lqip-extract", async (tempDir) => {
        const filePath = path.join(tempDir, "lqip.webp");
        fs.writeFileSync(filePath, Buffer.from([0, 1, 2, 3]));
        const result = await extractLqipFromMetadata({
          webp: [{ width: LQIP_WIDTH, outputPath: filePath }],
        });
        expect(result).toMatch(/^url\('data:image\/webp;base64,/);
      }));
  });

  describe("shouldGenerateLqip", () => {
    test("returns false for svg images regardless of size", () =>
      withTempFile(
        "lqip-svg",
        "image.svg",
        Buffer.alloc(10000),
        (_dir, filePath) => {
          expect(shouldGenerateLqip(filePath, { format: "svg" })).toBe(false);
        },
      ));

    test("returns false for small images under threshold", () =>
      withTempFile(
        "lqip-small",
        "small.webp",
        Buffer.alloc(100),
        (_dir, filePath) => {
          expect(shouldGenerateLqip(filePath, { format: "webp" })).toBe(false);
        },
      ));

    test("returns true for large non-svg images", () =>
      withTempFile(
        "lqip-large",
        "large.webp",
        Buffer.alloc(6000),
        (_dir, filePath) => {
          expect(shouldGenerateLqip(filePath, { format: "webp" })).toBe(true);
        },
      ));
  });

  describe("removeLqip", () => {
    test("removes images with LQIP_WIDTH from each format", () => {
      const metadata = {
        webp: [
          { width: LQIP_WIDTH, outputPath: "lqip.webp" },
          { width: 800, outputPath: "full.webp" },
        ],
        jpeg: [
          { width: LQIP_WIDTH, outputPath: "lqip.jpg" },
          { width: 400, outputPath: "half.jpg" },
        ],
      };
      const result = removeLqip(metadata);
      expect(result.webp).toEqual([{ width: 800, outputPath: "full.webp" }]);
      expect(result.jpeg).toEqual([{ width: 400, outputPath: "half.jpg" }]);
    });

    test("keeps all images when none match LQIP_WIDTH", () => {
      const metadata = {
        webp: [{ width: 800 }, { width: 400 }],
      };
      const result = removeLqip(metadata);
      expect(result.webp).toHaveLength(2);
    });
  });
});
