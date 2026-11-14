import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  getCropImageOptions,
  getMetadata,
  getSharp,
} from "#media/image-crop.js";
import { withTempDirAsync } from "#test/test-utils.js";

describe("getCropImageOptions", () => {
  test("returns no options without an aspect ratio", () => {
    expect(getCropImageOptions(null)).toEqual({});
  });

  test("builds a cover-crop transform for the requested ratio", () => {
    const { manualCacheKey, transform } = getCropImageOptions("2/1");
    const resize = vi.fn(() => "resized");

    const result = transform({ resize }, { width: 160 });

    expect(manualCacheKey).toBe("2/1");
    expect(result).toBe("resized");
    expect(resize).toHaveBeenCalledWith({
      width: 160,
      height: 80,
      fit: "cover",
      position: "centre",
    });
  });
});

describe("getMetadata", () => {
  test("swaps dimensions for EXIF-rotated images", async () => {
    await withTempDirAsync("image-crop-exif", async (dir) => {
      const sharp = await getSharp();
      const imagePath = join(dir, "rotated.jpg");
      const rotatedJpeg = await sharp({
        create: {
          width: 2,
          height: 4,
          channels: 3,
          background: { r: 10, g: 20, b: 30 },
        },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer();
      writeFileSync(imagePath, rotatedJpeg);

      const { width, height } = await getMetadata(imagePath);

      expect([width, height]).toEqual([4, 2]);
    });
  }, 30_000);
});
