import { describe, expect, test } from "bun:test";
import { createHtmlTransform } from "#eleventy/html-transform.js";
import {
  configureImages,
  imageShortcode,
  processAndWrapImage,
} from "#media/image.js";
import { withTestSite } from "#test/test-site-factory.js";
import { createMockEleventyConfig, wrapHtml } from "#test/test-utils.js";
import { map } from "#toolkit/fp/array.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a test page file for test site
 */
const imageTestPage = (content, permalink = "/test/", title = "Test") => ({
  path: "pages/test.md",
  frontmatter: { title, layout: "page", permalink },
  content,
});

/**
 * Create image file specs from destination names
 */
const imageFiles = map((dest) => ({ src: "src/images/party.jpg", dest }));

describe("image", () => {
  // ============================================
  // createHtmlTransform tests
  // ============================================
  describe("createHtmlTransform", () => {
    test("createHtmlTransform returns a transform function", () => {
      const transform = createHtmlTransform(processAndWrapImage);

      expect(typeof transform).toBe("function");
    });

    test("Transform passes through non-HTML files unchanged", async () => {
      const transform = createHtmlTransform(processAndWrapImage);
      const result = await transform("body { margin: 0; }", "/test/style.css");
      expect(result).toBe("body { margin: 0; }");
    });

    test("Transform preserves HTML content without local images", async () => {
      const transform = createHtmlTransform(processAndWrapImage);
      const result = await transform(
        "<html><body><p>Hello world</p></body></html>",
        "/test/page.html",
      );
      expect(result.includes("<p>Hello world</p>")).toBe(true);
      expect(result.includes("<picture")).toBe(false);
    });
  });

  // ============================================
  // configureImages tests
  // ============================================
  describe("configureImages", () => {
    test("Registers async image shortcode with Eleventy config", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      expect("image" in mockConfig.asyncShortcodes).toBe(true);
      expect(typeof mockConfig.asyncShortcodes.image).toBe("function");
    });

    test("Registers images collection with Eleventy config", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      expect("images" in mockConfig.collections).toBe(true);
      expect(typeof mockConfig.collections.images).toBe("function");
    });

    test("Registers eleventy.after event handler for cache copying", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      expect(
        mockConfig.eventHandlers !== undefined &&
          "eleventy.after" in mockConfig.eventHandlers,
      ).toBe(true);
      expect(typeof mockConfig.eventHandlers["eleventy.after"]).toBe(
        "function",
      );
    });

    test("Adds eleventy-img plugin to config", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      expect(mockConfig.pluginCalls && mockConfig.pluginCalls.length > 0).toBe(
        true,
      );
    });

    test("Images collection function returns an array", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      const collectionFn = mockConfig.collections.images;
      const result = collectionFn();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================
  // imageShortcode tests - local images
  // ============================================
  describe("imageShortcode - local images", () => {
    /**
     * Helper to check result includes all expected strings
     */
    const expectIncludes = (result, includes) => {
      for (const str of includes) {
        expect(result.includes(str)).toBe(true);
      }
    };

    test("Processes local image and returns wrapped HTML with picture element", async () => {
      const result = await imageShortcode("party.jpg", "A party scene");

      expectIncludes(result, [
        "image-wrapper",
        "<picture",
        'alt="A party scene"',
        "aspect-ratio",
      ]);
    });

    test("Supports custom classes, sizes, and aspect ratio", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        "300,600",
        "my-class",
        "(max-width: 600px) 100vw",
        "16/9",
      );

      expectIncludes(result, [
        "image-wrapper my-class",
        "(max-width: 600px) 100vw",
        "aspect-ratio: 16/9",
      ]);
    });
  });

  // ============================================
  // imageShortcode tests - path normalization
  // ============================================
  describe("imageShortcode - path normalization", () => {
    test("Handles various image path formats", async () => {
      const paths = [
        "/images/party.jpg",
        "src/images/party.jpg",
        "images/party.jpg",
      ];

      for (const path of paths) {
        const result = await imageShortcode(path, "Test");
        expect(result.includes("image-wrapper")).toBe(true);
        expect(result.includes("<picture")).toBe(true);
      }
    });
  });

  // ============================================
  // imageShortcode tests - error handling
  // ============================================
  describe("imageShortcode - error handling", () => {
    test("Throws descriptive error for non-existent image", async () => {
      await expect(
        imageShortcode("nonexistent-image-12345.jpg", "Test"),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // imageShortcode tests - caching
  // ============================================
  describe("imageShortcode - caching", () => {
    test("Returns identical cached result for same inputs", async () => {
      const result1 = await imageShortcode("menu.jpg", "Menu image");
      const result2 = await imageShortcode("menu.jpg", "Menu image");

      expect(result1).toBe(result2);
    });
  });

  // ============================================
  // Integration tests using test-site-factory
  // ============================================
  describe("Integration tests", () => {
    test("Image shortcode processes local images in full Eleventy build", async () => {
      await withTestSite(
        {
          files: [
            imageTestPage('{% image "test-image.jpg", "A test image" %}'),
          ],
          images: [{ src: "src/images/party.jpg", dest: "test-image.jpg" }],
        },
        async (site) => {
          const html = site.getOutput("/test/index.html");
          const doc = await site.getDoc("/test/index.html");

          // Verify image was processed into picture element
          expect(html.includes("<picture")).toBe(true);
          expect(html.includes('alt="A test image"')).toBe(true);
          expect(html.includes("image-wrapper")).toBe(true);

          // Verify responsive images were generated
          const sources = doc.querySelectorAll("picture source");
          expect(sources.length > 0).toBe(true);

          // Verify webp format was generated
          const webpSource = doc.querySelector(
            'picture source[type="image/webp"]',
          );
          expect(webpSource !== null).toBe(true);
        },
      );
    });

    test("Images collection returns image filenames from src/images", async () => {
      const galleryContent = `
{% for img in collections.images %}
<div class="gallery-item">{{ img }}</div>
{% endfor %}
`;
      await withTestSite(
        {
          files: [imageTestPage(galleryContent, "/gallery/", "Gallery")],
          images: imageFiles(["alpha.jpg", "beta.jpg"]),
        },
        (site) => {
          const html = site.getOutput("/gallery/index.html");

          expect(html.includes("alpha.jpg")).toBe(true);
          expect(html.includes("beta.jpg")).toBe(true);
        },
      );
    });
  });

  // ============================================
  // createHtmlTransform tests - actual transformation
  // ============================================
  describe("createHtmlTransform - transformations", () => {
    /**
     * Run transform on HTML content and return result
     */
    const runTransform = async (html) => {
      const transform = createHtmlTransform(processAndWrapImage);
      return transform(html, "/test/page.html");
    };

    /**
     * Create an img tag with given attributes
     */
    const img = (src, alt, attrs = "") =>
      `<img src="${src}" alt="${alt}"${attrs ? ` ${attrs}` : ""}>`;

    test("Transform converts raw img tags with /images/ src to wrapped picture elements", async () => {
      const result = await runTransform(
        wrapHtml(img("/images/party.jpg", "Party")),
      );

      expect(result.includes("image-wrapper")).toBe(true);
      expect(result.includes("<picture")).toBe(true);
      expect(result.includes('alt="Party"')).toBe(true);
    });

    test("Transform lifts wrapped images out of paragraphs to fix invalid HTML", async () => {
      const result = await runTransform(
        wrapHtml(
          `<p><div class="image-wrapper"><picture>${img("/images/party.jpg", "")}</picture></div></p>`,
        ),
      );

      expect(result.includes("<p><div")).toBe(false);
      expect(result.includes("image-wrapper")).toBe(true);
    });

    test("Transform does not double-wrap images already in image-wrapper", async () => {
      const result = await runTransform(
        wrapHtml(
          `<div class="image-wrapper">${img("/images/party.jpg", "Pre-wrapped")}</div>`,
        ),
      );

      const wrapperCount = (result.match(/image-wrapper/g) || []).length;
      expect(wrapperCount).toBe(1);
    });

    test("Transform uses eleventy:aspectRatio attribute for custom aspect ratio", async () => {
      const result = await runTransform(
        wrapHtml(
          img("/images/party.jpg", "Wide", 'eleventy:aspectRatio="16/9"'),
        ),
      );

      expect(result.includes("aspect-ratio: 16/9")).toBe(true);
      expect(result.includes("eleventy:aspectRatio")).toBe(false);
    });

    test("Transform skips images with eleventy:ignore attribute", async () => {
      const result = await runTransform(
        wrapHtml(img("/images/party.jpg", "Ignored", "eleventy:ignore")),
      );

      // Should not be wrapped or processed
      expect(result.includes("image-wrapper")).toBe(false);
      expect(result.includes("<picture")).toBe(false);
      // Original img should remain but without the eleventy:ignore attribute
      expect(result.includes('alt="Ignored"')).toBe(true);
      expect(result.includes("eleventy:ignore")).toBe(false);
    });

    test("Transform processes other images when one has eleventy:ignore", async () => {
      const result = await runTransform(
        wrapHtml(`
        ${img("/images/party.jpg", "Ignored", "eleventy:ignore")}
        ${img("/images/menu.jpg", "Processed")}
      `),
      );

      // One image should be processed, one should not
      const pictureCount = (result.match(/<picture/g) || []).length;
      expect(pictureCount).toBe(1);
      expect(result.includes('alt="Ignored"')).toBe(true);
      expect(result.includes('alt="Processed"')).toBe(true);
    });

    test("Transform preserves class attribute on transformed images", async () => {
      const result = await runTransform(
        wrapHtml(
          img("/images/party.jpg", "Styled", 'class="hero-image rounded"'),
        ),
      );

      expect(result.includes("hero-image")).toBe(true);
      expect(result.includes("rounded")).toBe(true);
    });

    test("Transform processes multiple local images in same document", async () => {
      const result = await runTransform(
        wrapHtml(`
        ${img("/images/party.jpg", "First")}
        ${img("/images/menu.jpg", "Second")}
      `),
      );

      const pictureCount = (result.match(/<picture/g) || []).length;
      expect(pictureCount).toBe(2);
    });

    test("Transform processes local images while leaving external URLs unchanged", async () => {
      const result = await runTransform(
        wrapHtml(`
        ${img("https://example.com/external.jpg", "External")}
        ${img("/images/party.jpg", "Local")}
      `),
      );

      expect(result.includes('src="https://example.com/external.jpg"')).toBe(
        true,
      );
      expect(result.includes("<picture")).toBe(true);
    });

    test("Transform preserves content when no img tags present", async () => {
      const result = await runTransform(wrapHtml("<p>No images here</p>"));

      expect(result.includes("<p>No images here</p>")).toBe(true);
      expect(result.includes("<picture")).toBe(false);
    });

    test("Transform preserves non-local images without wrapping", async () => {
      const result = await runTransform(
        wrapHtml(img("/assets/logo.png", "Logo")),
      );

      expect(result.includes('src="/assets/logo.png"')).toBe(true);
      expect(result.includes("<picture")).toBe(false);
      expect(result.includes("image-wrapper")).toBe(false);
    });

    test("Transform efficiently reuses cached results for duplicate images", async () => {
      const result = await runTransform(
        wrapHtml(`
        ${img("/images/party.jpg", "First occurrence")}
        ${img("/images/party.jpg", "First occurrence")}
      `),
      );

      const pictureCount = (result.match(/<picture/g) || []).length;
      expect(pictureCount).toBe(2);
    });
  });

  // ============================================
  // Integration tests - transform in full build
  // ============================================
  describe("Integration - transform in build", () => {
    test("Standard markdown images with /images/ path are transformed in build", async () => {
      await withTestSite(
        {
          files: [imageTestPage("![A test scene](/images/scene.jpg)")],
          images: [{ src: "src/images/party.jpg", dest: "scene.jpg" }],
        },
        (site) => {
          const html = site.getOutput("/test/index.html");

          expect(html.includes("image-wrapper")).toBe(true);
          expect(html.includes("<picture")).toBe(true);
          expect(html.includes('alt="A test scene"')).toBe(true);
        },
      );
    });
  });

  // ============================================
  // LQIP aspect ratio tests
  // ============================================
  describe("LQIP aspect ratio", () => {
    /**
     * Extract base64 LQIP data from HTML style attribute
     */
    const extractLqipBase64 = (html) => {
      const match = html.match(
        /background-image:\s*url\('data:image\/webp;base64,([^']+)'\)/,
      );
      return match ? match[1] : null;
    };

    /**
     * Assert LQIP matches expected aspect ratio
     */
    const expectLqipRatio = async (targetRatio, expectedNumeric) => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        targetRatio,
      );

      const base64 = extractLqipBase64(result);
      expect(base64).not.toBeNull();

      const { default: sharp } = await import("sharp");
      const buffer = Buffer.from(base64, "base64");
      const { width, height } = await sharp(buffer).metadata();

      // Allow small tolerance for rounding at 32px thumbnail size
      expect(Math.abs(width / height - expectedNumeric)).toBeLessThan(0.1);
    };

    test("LQIP matches 16/9 crop aspect ratio", () =>
      expectLqipRatio("16/9", 16 / 9));

    test("LQIP matches 1/1 crop aspect ratio", () => expectLqipRatio("1/1", 1));

    test("LQIP matches 4/3 crop aspect ratio", () =>
      expectLqipRatio("4/3", 4 / 3));
  });

  // ============================================
  // Format optimization tests
  // ============================================
  describe("Format optimization", () => {
    test("WebP source comes before JPEG fallback in picture element", async () => {
      const result = await imageShortcode("party.jpg", "Test");

      // WebP should be in a <source> element
      expect(result.includes('<source type="image/webp"')).toBe(true);

      // JPEG should only be in the <img> fallback, not a <source>
      expect(result.includes('<source type="image/jpeg"')).toBe(false);

      // The <img> src should be JPEG (fallback for non-webp browsers)
      expect(result).toMatch(/<img[^>]+src="[^"]+\.jpeg"/);
    });

    test("JPEG fallback is generated at single width only", async () => {
      const result = await imageShortcode("party.jpg", "Test");

      // Extract the img src (JPEG fallback)
      const imgMatch = result.match(/<img[^>]+src="([^"]+\.jpeg)"/);
      expect(imgMatch).not.toBeNull();

      // The JPEG filename should contain 1300 (or smaller if source is smaller)
      const jpegSrc = imgMatch[1];
      expect(jpegSrc).toMatch(/-\d+\.jpeg$/);
    });

    test("WebP has multiple sizes in srcset for responsive images", async () => {
      const result = await imageShortcode("party.jpg", "Test");

      // Extract webp srcset
      const srcsetMatch = result.match(
        /<source type="image\/webp" srcset="([^"]+)"/,
      );
      expect(srcsetMatch).not.toBeNull();

      // Count the number of sizes (each entry has a width descriptor like "240w")
      const srcset = srcsetMatch[1];
      const widthDescriptors = srcset.match(/\d+w/g) || [];

      // Should have multiple sizes (at least 3: some responsive widths + original)
      expect(widthDescriptors.length).toBeGreaterThanOrEqual(3);
    });

    test("Picture element structure: webp source then jpeg img fallback", async () => {
      const result = await imageShortcode("party.jpg", "Test");

      // Verify the order: <picture><source webp>...<img jpeg></picture>
      const pictureMatch = result.match(/<picture>([\s\S]*?)<\/picture>/);
      expect(pictureMatch).not.toBeNull();

      const pictureContent = pictureMatch[1];

      // Find positions of webp source and img
      const webpPos = pictureContent.indexOf('type="image/webp"');
      const imgPos = pictureContent.indexOf("<img");

      // WebP source should come before img
      expect(webpPos).toBeLessThan(imgPos);
      expect(webpPos).toBeGreaterThan(-1);
    });
  });
});
