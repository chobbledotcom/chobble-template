import { describe, expect, test } from "bun:test";
import { processExternalImage } from "#media/image-external.js";

describe("image-external", () => {
  describe("processExternalImage", () => {
    test("returns HTML string when returnElement is false", async () => {
      const result = await processExternalImage({
        src: "https://example.com/image.jpg",
        alt: "Test image",
        loading: "lazy",
        classes: "featured",
        returnElement: false,
        document: null,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain('src="https://example.com/image.jpg"');
      expect(result).toContain('alt="Test image"');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('class="featured"');
    });

    test("returns HTMLImageElement when returnElement is true", async () => {
      const result = await processExternalImage({
        src: "https://example.com/image.jpg",
        alt: "Test image",
        loading: "eager",
        classes: "hero",
        returnElement: true,
        document: null,
      });

      expect(result).toBeInstanceOf(HTMLImageElement);
      expect(result.src).toBe("https://example.com/image.jpg");
      expect(result.alt).toBe("Test image");
      expect(result.loading).toBe("eager");
      expect(result.className).toBe("hero");
    });

    test("uses default loading when not provided", async () => {
      const result = await processExternalImage({
        src: "https://example.com/image.jpg",
        alt: "Test image",
        loading: null,
        classes: null,
        returnElement: true,
        document: null,
      });

      expect(result).toBeInstanceOf(HTMLImageElement);
      expect(result.loading).toBe("lazy");
    });

    test("omits class attribute when classes is null", async () => {
      const result = await processExternalImage({
        src: "https://example.com/image.jpg",
        alt: "Test image",
        loading: "lazy",
        classes: null,
        returnElement: false,
        document: null,
      });

      expect(result).not.toContain("class=");
    });
  });
});
