import { describe, expect, test } from "bun:test";
import { processExternalImage } from "#media/image-external.js";
import { expectAsyncThrows } from "#test/test-utils.js";
import { RICK_ASTLEY_VIDEO_ID } from "#utils/video.js";

describe("image-external", () => {
  describe("processExternalImage", () => {
    test("throws when external URL cannot be fetched", async () => {
      await expectAsyncThrows(() =>
        processExternalImage({
          src: "https://",
          alt: "Test image",
          loading: "lazy",
          classes: "featured",
          returnElement: false,
          document: null,
        }),
      );
    });

    test("returns placeholder HTML for Rick Astley thumbnail fetch failure", async () => {
      // Use a malformed URL that still contains the Rick Astley video ID
      // so isRickAstleyThumbnail returns true and processing falls back
      const result = await processExternalImage({
        src: `https://?v=${RICK_ASTLEY_VIDEO_ID}`,
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
