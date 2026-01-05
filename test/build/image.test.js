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
  // ============================================
  // findImageFiles tests
  // ============================================
  describe("findImageFiles", () => {
    test("findImageFiles returns an array for any input", () => {
      const result = findImageFiles([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test("findImageFiles accepts custom file patterns without throwing", () => {
      const customPattern = ["test/fixtures/*.png"];
      const result = findImageFiles(customPattern);
      expect(Array.isArray(result)).toBe(true);
    });
  });

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

    test("Returns empty array when input is null", () => {
      const result = createImagesCollection(null);

      expect(result).toEqual([]);
    });

    test("Returns empty array when input is undefined", () => {
      const result = createImagesCollection(undefined);

      expect(result).toEqual([]);
    });

    test("Extracts filename regardless of directory structure", () => {
      const files = ["assets/imgs/test.jpg", "public/photos/vacation.jpg"];

      const result = createImagesCollection(files);

      expect(result).toEqual(["vacation.jpg", "test.jpg"]);
    });

    test("Does not modify input array", () => {
      const originalFiles = ["src/images/test1.jpg", "src/images/test2.jpg"];
      const filesCopy = [...originalFiles];

      createImagesCollection(filesCopy);

      expect(filesCopy).toEqual(originalFiles);
    });

    test("Returns consistent results for identical inputs", () => {
      const files = ["src/images/test1.jpg", "src/images/test2.jpg"];

      const result1 = createImagesCollection(files);
      const result2 = createImagesCollection(files);

      expect(result1).toEqual(result2);
      expect(result1 !== result2).toBe(true);
    });
  });

  // ============================================
  // copyImageCache tests
  // ============================================
  describe("copyImageCache", () => {
    test("copyImageCache runs without throwing even if cache directory missing", () => {
      // If this throws, the test framework will catch it and fail the test
      copyImageCache();
      expect(true).toBe(true);
    });
  });

  // ============================================
  // createImageTransform tests
  // ============================================
  describe("createImageTransform", () => {
    test("createImageTransform returns a transform function", () => {
      const transform = createImageTransform();

      expect(typeof transform).toBe("function");
    });

    // Passthrough test cases - content that should pass through unchanged
    const passthroughCases = passthroughs([
      ["body { margin: 0; }", "/test/style.css"],
      ["<p>Test content</p>", null],
      [
        '<?xml version="1.0"?><feed><entry>test</entry></feed>',
        "/test/feed.xml",
      ],
      ['{"items": []}', "/test/feed.json"],
      ["<html><body><p>Hello world</p></body></html>", "/test/page.html"],
      [
        '<html><body><img src="https://example.com/image.jpg" alt="test"></body></html>',
        "/test/page.html",
      ],
    ]);

    test("Transform passes through CSS files unchanged", () =>
      expectPassthrough(passthroughCases[0]));

    test("Transform passes through content when output path is null", () =>
      expectPassthrough(passthroughCases[1]));

    test("Transform passes through feed.xml files without processing", () =>
      expectPassthrough(passthroughCases[2]));

    test("Transform passes through feed.json files without processing", () =>
      expectPassthrough(passthroughCases[3]));

    test("Transform passes through HTML without img tags", () =>
      expectPassthrough(passthroughCases[4]));

    test("Transform passes through HTML with only external image URLs", () =>
      expectPassthrough(passthroughCases[5]));
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

    test("Returns simple img tag for external HTTPS URLs without processing", async () => {
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

    test("Returns simple img tag for external HTTP URLs without processing", async () => {
      const result = await imageShortcode(
        "http://example.com/image.jpg",
        "HTTP image",
      );

      expectIncludes(result, [
        "<img",
        'src="http://example.com/image.jpg"',
        'alt="HTTP image"',
      ]);
    });

    test("Includes custom classes on external URL img tags", async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "Test",
        null,
        "my-custom-class",
      );

      expectIncludes(result, ['class="my-custom-class"']);
    });

    test("Handles empty alt text for external URLs (decorative images)", async () => {
      const result = await imageShortcode("https://example.com/image.jpg", "");

      expectIncludes(result, ['alt=""']);
    });

    test("External URL respects custom loading attribute", async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      expectIncludes(result, ['loading="eager"']);
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

    test("Applies custom classes to image wrapper", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        "my-class another-class",
      );

      expectIncludes(result, ["image-wrapper my-class another-class"]);
    });

    test("Processes local image with custom responsive widths", async () => {
      const result = await imageShortcode("party.jpg", "Test", "300,600");

      expectIncludes(result, ["<picture", "image-wrapper"]);
    });

    test("Processes local image with custom sizes attribute", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        "(max-width: 600px) 100vw, 50vw",
      );

      expectIncludes(result, ["(max-width: 600px) 100vw, 50vw"]);
    });

    test("Uses provided aspect ratio instead of calculated", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        "16/9",
      );

      expectIncludes(result, ["aspect-ratio: 16/9"]);
    });

    test("Processes local image with eager loading for LCP images", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      expectIncludes(result, ['loading="eager"']);
    });

    test("Accepts widths as array instead of comma-separated string", async () => {
      const result = await imageShortcode("party.jpg", "Test", [320, 640]);

      expectIncludes(result, ["<picture"]);
    });
  });

  // ============================================
  // imageShortcode tests - path normalization
  // ============================================
  describe("imageShortcode - path normalization", () => {
    /**
     * Helper to verify local image produces wrapped picture element
     */
    const expectLocalImage = async (path) => {
      const result = await imageShortcode(path, "Test");
      expect(result.includes("image-wrapper")).toBe(true);
      expect(result.includes("<picture")).toBe(true);
    };

    test("Handles image path starting with /", () =>
      expectLocalImage("/images/party.jpg"));

    test("Handles image path starting with src/", () =>
      expectLocalImage("src/images/party.jpg"));

    test("Handles image path starting with images/", () =>
      expectLocalImage("images/party.jpg"));
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

    test(
      "External image URLs pass through without processing in build",
      async () => {
        await withTestSite(
          {
            files: [
              testPage(
                '{% image "https://example.com/photo.jpg", "External photo" %}',
              ),
            ],
          },
          async (site) => {
            await site.build();

            const html = site.getOutput("/test/index.html");

            // External URLs should produce simple img tag, not picture
            expect(html.includes('src="https://example.com/photo.jpg"')).toBe(
              true,
            );
            expect(html.includes('alt="External photo"')).toBe(true);
            expect(!html.includes("<picture")).toBe(true);
          },
        );
      },
      { timeout: 30000 },
    );

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

    test("Image shortcode respects custom width parameter in build", async () => {
      await withTestSite(
        {
          files: [
            testPage('{% image "sized.jpg", "Sized image", "200,400" %}'),
          ],
          images: [imageFile("sized.jpg")],
        },
        (site) => {
          const html = site.getOutput("/test/index.html");
          const doc = site.getDoc("/test/index.html");

          expect(html.includes("<picture")).toBe(true);

          // Verify srcset contains the specified widths
          const sources = doc.querySelectorAll("picture source");
          const hasSrcset = Array.from(sources).some(
            (s) => s.getAttribute("srcset") !== null,
          );
          expect(hasSrcset).toBe(true);
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

    test("Image shortcode used inline in paragraph produces valid HTML structure", async () => {
      await withTestSite(
        {
          files: [
            testPage(
              'Check out this image: {% image "inline.jpg", "Inline test" %}',
            ),
          ],
          images: [imageFile("inline.jpg")],
        },
        (site) => {
          const html = site.getOutput("/test/index.html");

          expect(html.includes("<p><div")).toBe(false);
          expect(html.includes("image-wrapper")).toBe(true);
        },
      );
    });
  });
});
