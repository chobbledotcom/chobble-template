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
        async (_dir, filePath) => {
          expect(await shouldGenerateLqip(filePath, { format: "svg" })).toBe(
            false,
          );
        },
      ));

    test("returns false for small images under threshold", () =>
      withTempFile(
        "lqip-small",
        "small.webp",
        Buffer.alloc(100),
        async (_dir, filePath) => {
          expect(await shouldGenerateLqip(filePath, { format: "webp" })).toBe(
            false,
          );
        },
      ));

    test("returns true for large non-svg images without alpha channel", () =>
      withTempFile(
        "lqip-large",
        "large.webp",
        Buffer.alloc(6000),
        async (_dir, filePath) => {
          expect(await shouldGenerateLqip(filePath, { format: "webp" })).toBe(
            true,
          );
        },
      ));

    const writeRandomPng = async (filePath, alpha) => {
      const sharp = (await import("sharp")).default;
      const width = 200;
      const height = 200;
      const pixels = Buffer.alloc(width * height * 4);
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.floor(Math.random() * 256);
        pixels[i + 1] = Math.floor(Math.random() * 256);
        pixels[i + 2] = Math.floor(Math.random() * 256);
        pixels[i + 3] = alpha;
      }
      await sharp(pixels, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(filePath);
      return sharp(filePath).metadata();
    };

    const expectLqipForAlpha = (label, alpha, expected) =>
      test(label, () =>
        withTempDirAsync(`lqip-png-alpha-${alpha}`, async (tempDir) => {
          const filePath = path.join(tempDir, "image.png");
          const metadata = await writeRandomPng(filePath, alpha);
          expect(metadata.hasAlpha).toBe(true);
          expect(Bun.file(filePath).size).toBeGreaterThan(5 * 1024);
          expect(await shouldGenerateLqip(filePath, metadata)).toBe(expected);
        }),
      );

    expectLqipForAlpha(
      "returns false for png with transparent pixels",
      128,
      false,
    );
    expectLqipForAlpha(
      "returns true for png with alpha channel but all opaque pixels",
      255,
      true,
    );
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
