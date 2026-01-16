import { describe, expect, test } from "bun:test";
import {
  buildImgAttributes,
  buildWrapperStyles,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
} from "#media/image-utils.js";

describe("image-utils", () => {
  describe("normalizeImagePath", () => {
    test("prepends ./src for paths starting with /", () => {
      expect(normalizeImagePath("/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./ for paths starting with src/", () => {
      expect(normalizeImagePath("src/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/ for paths starting with images/", () => {
      expect(normalizeImagePath("images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/images/ for bare filenames", () => {
      expect(normalizeImagePath("photo.jpg")).toBe("./src/images/photo.jpg");
    });
  });

  describe("isExternalUrl", () => {
    test("returns true for http:// URLs", () => {
      expect(isExternalUrl("http://example.com/image.jpg")).toBe(true);
    });

    test("returns true for https:// URLs", () => {
      expect(isExternalUrl("https://example.com/image.jpg")).toBe(true);
    });

    test("returns false for relative paths", () => {
      expect(isExternalUrl("/images/photo.jpg")).toBe(false);
    });

    test("returns false for bare filenames", () => {
      expect(isExternalUrl("photo.jpg")).toBe(false);
    });
  });

  describe("parseWidths", () => {
    test("splits comma-separated string into array", () => {
      expect(parseWidths("240,480,900")).toEqual(["240", "480", "900"]);
    });

    test("returns array as-is", () => {
      const widths = [240, 480, 900];
      expect(parseWidths(widths)).toBe(widths);
    });

    test("returns default widths for null/undefined", () => {
      const result = parseWidths(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("buildImgAttributes", () => {
    test("builds attributes with provided values", () => {
      const attrs = buildImgAttributes("A photo", "100vw", "eager");
      expect(attrs).toEqual({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
        decoding: "async",
      });
    });

    test("uses defaults for missing values", () => {
      const attrs = buildImgAttributes(null, null, null);
      expect(attrs.alt).toBe("");
      expect(attrs.loading).toBe("lazy");
      expect(attrs.decoding).toBe("async");
    });
  });

  describe("buildWrapperStyles", () => {
    const mockGetAspectRatio = (ratio, _metadata) => ratio || "auto";

    test("builds style string with background image", () => {
      const styles = buildWrapperStyles(
        "url(thumb.jpg)",
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
      );
      expect(styles).toContain("background-image: url(thumb.jpg)");
      expect(styles).toContain("aspect-ratio: 16:9");
      expect(styles).toContain("max-width: min(800px, 100%)");
    });

    test("omits background image when not provided", () => {
      const styles = buildWrapperStyles(
        null,
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
      );
      expect(styles).not.toContain("background-image");
    });

    test("omits max-width when metadata has no width", () => {
      const styles = buildWrapperStyles(null, "16:9", {}, mockGetAspectRatio);
      expect(styles).not.toContain("max-width");
    });
  });
});
