import { describe, expect, test } from "bun:test";
import { generatePlaceholderHtml } from "#media/image-placeholder.js";

describe("image-placeholder", () => {
  describe("generatePlaceholderHtml", () => {
    test("generates placeholder with default values", async () => {
      const html = await generatePlaceholderHtml({});

      expect(html).toContain("image-wrapper");
      expect(html).toContain("aspect-ratio: 1/1");
      expect(html).toContain("background: #eee");
      expect(html).toContain("<picture>");
      expect(html).toContain("<img");
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('decoding="async"');
      expect(html).toContain("data:image/png;base64,");
    });

    test("applies custom alt text", async () => {
      const html = await generatePlaceholderHtml({ alt: "Test image" });

      expect(html).toContain('alt="Test image"');
    });

    test("applies custom classes", async () => {
      const html = await generatePlaceholderHtml({ classes: "banner hero" });

      expect(html).toContain('class="image-wrapper banner hero"');
    });

    test("applies custom sizes", async () => {
      const html = await generatePlaceholderHtml({
        sizes: "(max-width: 768px) 100vw",
      });

      expect(html).toContain('sizes="(max-width: 768px) 100vw"');
    });

    test("applies custom loading attribute", async () => {
      const html = await generatePlaceholderHtml({ loading: "eager" });

      expect(html).toContain('loading="eager"');
    });

    test("applies custom aspect ratio", async () => {
      const html = await generatePlaceholderHtml({ aspectRatio: "16/9" });

      expect(html).toContain("aspect-ratio: 16/9");
    });

    test("handles all options together", async () => {
      const html = await generatePlaceholderHtml({
        alt: "Banner image",
        classes: "banner",
        sizes: "100vw",
        loading: "eager",
        aspectRatio: "3/1",
      });

      expect(html).toContain('alt="Banner image"');
      expect(html).toContain('class="image-wrapper banner"');
      expect(html).toContain('sizes="100vw"');
      expect(html).toContain('loading="eager"');
      expect(html).toContain("aspect-ratio: 3/1");
    });
  });
});
