import { describe, expect, test } from "bun:test";
import {
  configureImages,
  copyImageCache,
  createImagesCollection,
  createImageTransform,
  findImageFiles,
  imageShortcode,
} from "#media/image.js";
import { withTestSite } from "#test/test-site-factory.js";
import { createMockEleventyConfig } from "#test/test-utils.js";
import { map } from "#utils/array-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a transform passthrough test case
 * @param {string} content - Content to pass through
 * @param {string|null} path - Output path
 */
const passthrough = (content, path) => ({ content, path });

/**
 * Create passthrough test cases from [content, path] tuples
 */
const passthroughs = map(([content, path]) => passthrough(content, path));

/**
 * Test that transform passes content through unchanged
 */
const expectPassthrough = async ({ content, path }) => {
  const transform = createImageTransform();
  const result = await transform(content, path);
  expect(result).toBe(content);
};

/**
 * Create an image file spec for test site
 */
const imageFile = (dest, src = "src/images/party.jpg") => ({ src, dest });

/**
 * Create a test page file for test site
 */
const testPage = (content, permalink = "/test/", title = "Test") => ({
  path: "pages/test.md",
  frontmatter: { title, layout: "page", permalink },
  content,
});

/**
 * Create image files from destination names
 */
const imageFiles = map((dest) => imageFile(dest));

describe("image", () => {
  // findImageFiles is tested implicitly through integration tests

  // ============================================
  // createImagesCollection tests
  // ============================================
  describe("createImagesCollection", () => {
    test("Extracts filenames from paths and reverses order", () => {
      const imageFiles = [
        "src/images/photo1.jpg",
        "src/images/photo2.jpg",
        "src/images/banner.jpg",
      ];

      const result = createImagesCollection(imageFiles);

      expect(result).toEqual(["banner.jpg", "photo2.jpg", "photo1.jpg"]);
    });

    test("Returns empty array for empty input", () => {
      const result = createImagesCollection([]);

      expect(result).toEqual([]);
    });
  });

  // copyImageCache is tested implicitly through integration tests

  // ============================================
  // createImageTransform tests
  // ============================================
  describe("createImageTransform", () => {
    test("createImageTransform returns a transform function", () => {
      const transform = createImageTransform();

      expect(typeof transform).toBe("function");
    });

    test("Transform passes through non-HTML files unchanged", () =>
      expectPassthrough(passthrough("body { margin: 0; }", "/test/style.css")));

    test("Transform passes through HTML without local images", () =>
      expectPassthrough(
        passthrough(
          "<html><body><p>Hello world</p></body></html>",
          "/test/page.html",
        ),
      ));
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

    test("Registers processImages transform with Eleventy config", async () => {
      const mockConfig = createMockEleventyConfig();

      await configureImages(mockConfig);

      expect("processImages" in mockConfig.transforms).toBe(true);
      expect(typeof mockConfig.transforms.processImages).toBe("function");
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
  // imageShortcode tests - external URLs
  // ============================================
  describe("imageShortcode - external URLs", () => {
    /**
     * Helper to check result includes all expected strings and excludes others
     */
    const expectIncludes = (result, includes, excludes = []) => {
      for (const str of includes) {
        expect(result.includes(str)).toBe(true);
      }
      for (const str of excludes) {
        expect(result.includes(str)).toBe(false);
      }
    };

    test("Returns simple img tag for external URLs without processing", async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "External image",
      );

      expectIncludes(
        result,
        [
          "<img",
          'src="https://example.com/image.jpg"',
          'alt="External image"',
          'loading="lazy"',
          'decoding="async"',
        ],
        ["image-wrapper", "background-image"],
      );
    });

    test("External URLs support custom classes and loading attributes", async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "Test",
        null,
        "my-custom-class",
        null,
        null,
        "eager",
      );

      expectIncludes(result, ['class="my-custom-class"', 'loading="eager"']);
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
          files: [testPage('{% image "test-image.jpg", "A test image" %}')],
          images: [imageFile("test-image.jpg")],
        },
        (site) => {
          const html = site.getOutput("/test/index.html");
          const doc = site.getDoc("/test/index.html");

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
          files: [testPage(galleryContent, "/gallery/", "Gallery")],
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
  // createImageTransform tests - actual transformation
  // ============================================
  describe("createImageTransform - transformations", () => {
    /**
     * Run transform on HTML content and return result
     */
    const runTransform = async (html) => {
      const transform = createImageTransform();
      return transform(html, "/test/page.html");
    };

    /**
     * Wrap body content in HTML structure
     */
    const wrapHtml = (body) => `<html><body>${body}</body></html>`;

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

    test("Transform returns content unchanged when no img tags present", async () => {
      const content = wrapHtml("<p>No images here</p>");
      const result = await runTransform(content);

      expect(result).toBe(content);
    });

    test("Transform returns content unchanged when only non-local images present", async () => {
      const content = wrapHtml(img("/assets/logo.png", "Logo"));
      const result = await runTransform(content);

      expect(result).toBe(content);
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
          files: [testPage("![A test scene](/images/scene.jpg)")],
          images: [imageFile("scene.jpg")],
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
});
