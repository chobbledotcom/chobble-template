import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { withTestSite } from "#test/test-site-factory.js";

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
});
