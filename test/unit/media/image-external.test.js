import { describe, expect, test } from "bun:test";
import { processExternalImage } from "#media/image-external.js";
import { RICK_ASTLEY_VIDEO_ID } from "#utils/video.js";

describe("image-external", () => {
  describe("processExternalImage", () => {
    test("throws when external URL cannot be fetched", async () => {
      await expect(
        processExternalImage({
          src: "https://example.com/nonexistent-image.jpg",
          alt: "Test image",
          loading: "lazy",
          classes: "featured",
          returnElement: false,
          document: null,
        }),
      ).rejects.toThrow();
    });

    test("returns placeholder HTML for Rick Astley thumbnail fetch failure", async () => {
      const result = await processExternalImage({
        src: `https://img.youtube.com/vi/${RICK_ASTLEY_VIDEO_ID}/hqdefault.jpg`,
        alt: "Video thumbnail",
        loading: "lazy",
        classes: null,
        sizes: null,
        widths: null,
        aspectRatio: "16/9",
        returnElement: false,
        document: null,
      });
      expect(result).toContain("placeholders/pink.svg");
      expect(result).toContain("image-wrapper");
      expect(result).toContain("aspect-ratio: 16/9");
    });
  });
});
