import { describe, expect, test } from "bun:test";
import { processExternalImage } from "#media/image-external.js";

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
  });
});
