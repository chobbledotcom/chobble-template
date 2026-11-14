import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  getCropImageOptions,
  getMetadata,
  sanitizeCropWidths,
} from "#media/image-crop.js";
import { cleanupTempDir, createTempDir } from "#test/test-utils.js";

describe("image-crop", () => {
  test("clamps and deduplicates crop widths", () => {
    expect(
      sanitizeCropWidths([32, 240, 480, "auto"], "1/1", {
        width: 600,
        height: 200,
      }),
    ).toEqual([32, 200]);
  });

  test("preserves source width when the crop fits without upscaling", () => {
    expect(
      sanitizeCropWidths([240, "auto"], "16/9", {
        width: 600,
        height: 600,
      }),
    ).toEqual([240, 600]);
  });

  test("leaves uncropped widths unchanged", () => {
    const widths = [32, 240, "auto"];
    expect(sanitizeCropWidths(widths, null, { width: 600, height: 200 })).toBe(
      widths,
    );
  });

  test("uses the aspect ratio as the manual cache key", () => {
    expect(getCropImageOptions("16/9").manualCacheKey).toBe("16/9");
    expect(getCropImageOptions(null)).toEqual({});
  });

  test("transforms each target width to the crop ratio", async () => {
    const { default: sharp } = await import("sharp");
    const transform = getCropImageOptions("16/9").transform;
    const image = sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    }).png();

    transform(image, { width: 320 });
    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);
  });

  test("applies EXIF rotation when transforming a crop", async () => {
    const { default: sharp } = await import("sharp");
    const tempDir = createTempDir("exif-crop");

    try {
      const greenOverlay = await sharp({
        create: {
          width: 300,
          height: 200,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const imagePath = path.join(tempDir, "rotated.jpg");
      await sharp({
        create: {
          width: 600,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .composite([{ input: greenOverlay, left: 300, top: 0 }])
        .jpeg({ quality: 100 })
        .withMetadata({ orientation: 6 })
        .toFile(imagePath);

      const metadata = await getMetadata(imagePath);
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(600);

      const image = sharp(imagePath);
      getCropImageOptions("16/9").transform(image, { width: 200 });
      const buffer = await image.rotate().jpeg().toBuffer();
      const { data } = await sharp(buffer)
        .extract({ left: 100, top: 111, width: 1, height: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(data[1]).toBeGreaterThan(100);
      expect(data[0]).toBeLessThan(100);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
