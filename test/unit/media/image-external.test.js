import { describe, expect, test } from "vitest";
import { computeExternalImageHtml } from "#media/image-external.js";

describe("image-external", () => {
  describe("computeExternalImageHtml", () => {
    test("rejects an invalid external URL", async () => {
      await expect(
        computeExternalImageHtml({
          imageName: "https://",
          alt: "Test image",
          loading: "lazy",
          classes: "featured",
        }),
      ).rejects.toMatchObject({ code: "ENOENT", path: "https://" });
    });
  });
});
