import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { withTestSite } from "#test/test-site-factory.js";
import { cleanupTempDir, createTempDir } from "#test/test-utils.js";

describe("image-crop", () => {
  // Composed helper: sets up test site and provides imagePath + metadata
  const withImageContext = (testFn) =>
    withTestSite(
      {
        images: ["party.jpg"],
        files: [
          {
            path: "pages/index.md",
            frontmatter: { title: "Test", permalink: "/" },
            content: "Test",
          },
        ],
      },
      async (site) => {
        const imagePath = path.join(site.srcDir, "images/party.jpg");
        const metadata = await getMetadata(imagePath);
        return testFn({ imagePath, metadata });
      },
    );

  test("Crops image to aspect ratio and caches result", () =>
    withImageContext(async ({ imagePath, metadata }) => {
      const croppedPath = await cropImage("16/9", imagePath, metadata);
      expect(fs.existsSync(croppedPath)).toBe(true);

      const croppedMeta = await getMetadata(croppedPath);
      const expectedHeight = Math.round(metadata.width / (16 / 9));
      expect(croppedMeta.height).toBe(expectedHeight);
    }));

  test("Returns original path when aspect ratio is null", () =>
    withImageContext(async ({ imagePath, metadata }) => {
      const result = await cropImage(null, imagePath, metadata);
      expect(result).toBe(imagePath);
    }));

  test("Calculates aspect ratio from image dimensions", () =>
    withImageContext(async ({ metadata }) => {
      const ratio = getAspectRatio(null, metadata);
      expect(ratio).toMatch(/^\d+\/\d+$/);
    }));

  test("Applies EXIF rotation when cropping", async () => {
    const { default: sharp } = await import("sharp");
    const tempDir = createTempDir("exif-crop");

    try {
      // Create a 600x200 image: left half red, right half green.
      // EXIF orientation 6 (90° CW to display correctly).
      // After rotation: 200x600, top 300 rows red, bottom 300 rows green.
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
      // getMetadata swaps dimensions for orientation 6
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(600);

      // Crop to 16/9. cropHeight = round(200 / (16/9)) = 113.
      // Center crop from rotated 200x600: rows ~244-356.
      // Row 300 is the red/green boundary, so bottom of crop is in the green zone.
      // Without .rotate(), sharp crops from raw 600x200 — center columns are all red.
      const croppedPath = await cropImage("16/9", imagePath, metadata);
      const expectedHeight = Math.round(200 / (16 / 9));

      // Extract pixel near the bottom of the crop: should be green if rotated.
      const { data } = await sharp(croppedPath)
        .extract({ left: 100, top: expectedHeight - 1, width: 1, height: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Green channel should dominate (rotation placed the green half at the bottom).
      // Without rotation this pixel would be red.
      expect(data[1]).toBeGreaterThan(100);
      expect(data[0]).toBeLessThan(100);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
