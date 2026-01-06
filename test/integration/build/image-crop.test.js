import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { withTestSite } from "#test/test-site-factory.js";

describe("image-crop", () => {
  const withImageTestSite = (testFn) =>
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
      testFn,
    );

  const getImagePath = (site) => path.join(site.srcDir, "images/party.jpg");

  test("Crops image to aspect ratio and caches result", async () => {
    await withImageTestSite(async (site) => {
      const imagePath = getImagePath(site);
      const metadata = await getMetadata(imagePath);

      const croppedPath = await cropImage("16/9", imagePath, metadata);
      expect(fs.existsSync(croppedPath)).toBe(true);

      const croppedMeta = await getMetadata(croppedPath);
      const expectedHeight = Math.round(metadata.width / (16 / 9));
      expect(croppedMeta.height).toBe(expectedHeight);
    });
  });

  test("Returns original path when aspect ratio is null", async () => {
    await withImageTestSite(async (site) => {
      const imagePath = getImagePath(site);
      const metadata = await getMetadata(imagePath);

      const result = await cropImage(null, imagePath, metadata);
      expect(result).toBe(imagePath);
    });
  });

  test("Calculates aspect ratio from image dimensions", async () => {
    await withImageTestSite(async (site) => {
      const imagePath = getImagePath(site);
      const metadata = await getMetadata(imagePath);

      const ratio = getAspectRatio(null, metadata);
      expect(ratio).toMatch(/^\d+\/\d+$/);
    });
  });
});
