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
      const imageFiles = ["assets/imgs/test.jpg", "public/photos/vacation.jpg"];

      const result = createImagesCollection(imageFiles);

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

    test("Transform passes through CSS files unchanged", async () => {
      const transform = createImageTransform();
      const cssContent = "body { margin: 0; }";
      const cssPath = "/test/style.css";

      const result = await transform(cssContent, cssPath);

      expect(result).toBe(cssContent);
    });

    test("Transform passes through content when output path is null", async () => {
      const transform = createImageTransform();
      const content = "<p>Test content</p>";

      const result = await transform(content, null);

      expect(result).toBe(content);
    });

    test("Transform passes through feed.xml files without processing", async () => {
      const transform = createImageTransform();
      const feedContent =
        '<?xml version="1.0"?><feed><entry>test</entry></feed>';
      const feedPath = "/test/feed.xml";

      const result = await transform(feedContent, feedPath);

      expect(result).toBe(feedContent);
    });

    test("Transform passes through feed.json files without processing", async () => {
      const transform = createImageTransform();
      const feedContent = '{"items": []}';
      const feedPath = "/test/feed.json";

      const result = await transform(feedContent, feedPath);

      expect(result).toBe(feedContent);
    });

    test("Transform passes through HTML without img tags", async () => {
      const transform = createImageTransform();
      const htmlContent = "<html><body><p>Hello world</p></body></html>";
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result).toBe(htmlContent);
    });

    test("Transform passes through HTML with only external image URLs", async () => {
      const transform = createImageTransform();
      const htmlContent =
        '<html><body><img src="https://example.com/image.jpg" alt="test"></body></html>';
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result).toBe(htmlContent);
    });
  });

  // ============================================
  // configureImages tests
  // ============================================
  describe("configureImages", () => {
    test("Registers async image shortcode with Eleventy config", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expect("image" in mockConfig.asyncShortcodes).toBe(true);
      expect(typeof mockConfig.asyncShortcodes.image).toBe("function");
    });

    test("Registers processImages transform with Eleventy config", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expect("processImages" in mockConfig.transforms).toBe(true);
      expect(typeof mockConfig.transforms.processImages).toBe("function");
    });

    test("Registers images collection with Eleventy config", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expect("images" in mockConfig.collections).toBe(true);
      expect(typeof mockConfig.collections.images).toBe("function");
    });

    test("Registers eleventy.after event handler for cache copying", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expect(
        mockConfig.eventHandlers !== undefined &&
          "eleventy.after" in mockConfig.eventHandlers,
      ).toBe(true);
      expect(typeof mockConfig.eventHandlers["eleventy.after"]).toBe(
        "function",
      );
    });

    test("Adds eleventy-img plugin to config", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expect(mockConfig.pluginCalls && mockConfig.pluginCalls.length > 0).toBe(
        true,
      );
    });

    test("Images collection function returns an array", () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      const collectionFn = mockConfig.collections.images;
      const result = collectionFn();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================
  // imageShortcode tests - external URLs
  // ============================================
  describe("imageShortcode - external URLs", () => {
    test("Returns simple img tag for external HTTPS URLs without processing", async () => {
      const externalUrl = "https://example.com/image.jpg";
      const alt = "External image";

      const result = await imageShortcode(externalUrl, alt);

      expect(result.includes("<img")).toBe(true);
      expect(result.includes('src="https://example.com/image.jpg"')).toBe(true);
      expect(result.includes('alt="External image"')).toBe(true);
      expect(result.includes('loading="lazy"')).toBe(true);
      expect(result.includes('decoding="async"')).toBe(true);
      expect(!result.includes("image-wrapper")).toBe(true);
      expect(!result.includes("background-image")).toBe(true);
    });

    test("Returns simple img tag for external HTTP URLs without processing", async () => {
      const externalUrl = "http://example.com/image.jpg";
      const alt = "HTTP image";

      const result = await imageShortcode(externalUrl, alt);

      expect(result.includes("<img")).toBe(true);
      expect(result.includes('src="http://example.com/image.jpg"')).toBe(true);
      expect(result.includes('alt="HTTP image"')).toBe(true);
    });

    test("Includes custom classes on external URL img tags", async () => {
      const externalUrl = "https://example.com/image.jpg";
      const result = await imageShortcode(
        externalUrl,
        "Test",
        null,
        "my-custom-class",
      );

      expect(result.includes('class="my-custom-class"')).toBe(true);
    });

    test("Handles empty alt text for external URLs (decorative images)", async () => {
      const externalUrl = "https://example.com/image.jpg";

      const result = await imageShortcode(externalUrl, "");

      expect(result.includes('alt=""')).toBe(true);
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

      expect(result.includes('loading="eager"')).toBe(true);
    });
  });

  // ============================================
  // imageShortcode tests - local images
  // ============================================
  describe("imageShortcode - local images", () => {
    test("Processes local image and returns wrapped HTML with picture element", async () => {
      const result = await imageShortcode("party.jpg", "A party scene");

      expect(result.includes("image-wrapper")).toBe(true);
      expect(result.includes("<picture")).toBe(true);
      expect(result.includes('alt="A party scene"')).toBe(true);
      expect(result.includes("aspect-ratio")).toBe(true);
    });

    test("Applies custom classes to image wrapper", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        "my-class another-class",
      );

      expect(result.includes("image-wrapper my-class another-class")).toBe(
        true,
      );
    });

    test("Processes local image with custom responsive widths", async () => {
      const result = await imageShortcode("party.jpg", "Test", "300,600");

      expect(result.includes("<picture")).toBe(true);
      expect(result.includes("image-wrapper")).toBe(true);
    });

    test("Processes local image with custom sizes attribute", async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        "(max-width: 600px) 100vw, 50vw",
      );

      expect(result.includes("(max-width: 600px) 100vw, 50vw")).toBe(true);
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

      expect(result.includes("aspect-ratio: 16/9")).toBe(true);
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

      expect(result.includes('loading="eager"')).toBe(true);
    });

    test("Accepts widths as array instead of comma-separated string", async () => {
      const result = await imageShortcode("party.jpg", "Test", [320, 640]);

      expect(result.includes("<picture")).toBe(true);
    });
  });

  // ============================================
  // imageShortcode tests - path normalization
  // ============================================
  describe("imageShortcode - path normalization", () => {
    test("Handles image path starting with /", async () => {
      const result = await imageShortcode("/images/party.jpg", "Test");

      expect(result.includes("image-wrapper")).toBe(true);
      expect(result.includes("<picture")).toBe(true);
    });

    test("Handles image path starting with src/", async () => {
      const result = await imageShortcode("src/images/party.jpg", "Test");

      expect(result.includes("image-wrapper")).toBe(true);
    });

    test("Handles image path starting with images/", async () => {
      const result = await imageShortcode("images/party.jpg", "Test");

      expect(result.includes("image-wrapper")).toBe(true);
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
            {
              path: "pages/test.md",
              frontmatter: {
                title: "Image Test",
                layout: "page",
                permalink: "/test/",
              },
              content: '{% image "test-image.jpg", "A test image" %}',
            },
          ],
          images: [{ src: "src/images/party.jpg", dest: "test-image.jpg" }],
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
              {
                path: "pages/test.md",
                frontmatter: {
                  title: "External Image Test",
                  layout: "page",
                  permalink: "/test/",
                },
                content:
                  '{% image "https://example.com/photo.jpg", "External photo" %}',
              },
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
      await withTestSite(
        {
          files: [
            {
              path: "pages/gallery.md",
              frontmatter: {
                title: "Gallery",
                layout: "page",
                permalink: "/gallery/",
              },
              content: `
{% for img in collections.images %}
<div class="gallery-item">{{ img }}</div>
{% endfor %}
`,
            },
          ],
          images: [
            { src: "src/images/party.jpg", dest: "alpha.jpg" },
            { src: "src/images/party.jpg", dest: "beta.jpg" },
          ],
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
            {
              path: "pages/test.md",
              frontmatter: {
                title: "Custom Widths Test",
                layout: "page",
                permalink: "/test/",
              },
              content: '{% image "sized.jpg", "Sized image", "200,400" %}',
            },
          ],
          images: [{ src: "src/images/party.jpg", dest: "sized.jpg" }],
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
    test("Transform converts raw img tags with /images/ src to wrapped picture elements", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><img src="/images/party.jpg" alt="Party"></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result.includes("image-wrapper")).toBe(true);
      expect(result.includes("<picture")).toBe(true);
      expect(result.includes('alt="Party"')).toBe(true);
    });

    test("Transform lifts wrapped images out of paragraphs to fix invalid HTML", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><p><div class="image-wrapper"><picture><img src="/images/party.jpg" alt=""></picture></div></p></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(!result.includes("<p><div")).toBe(true);
      expect(result.includes("image-wrapper")).toBe(true);
    });

    test("Transform does not double-wrap images already in image-wrapper", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><div class="image-wrapper"><img src="/images/party.jpg" alt="Pre-wrapped"></div></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      const wrapperCount = (result.match(/image-wrapper/g) || []).length;
      expect(wrapperCount).toBe(1);
    });

    test("Transform uses eleventy:aspectRatio attribute for custom aspect ratio", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><img src="/images/party.jpg" alt="Wide" eleventy:aspectRatio="16/9"></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result.includes("aspect-ratio: 16/9")).toBe(true);
      expect(!result.includes("eleventy:aspectRatio")).toBe(true);
    });

    test("Transform preserves class attribute on transformed images", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><img src="/images/party.jpg" alt="Styled" class="hero-image rounded"></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result.includes("hero-image")).toBe(true);
      expect(result.includes("rounded")).toBe(true);
    });

    test("Transform processes multiple local images in same document", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body>
        <img src="/images/party.jpg" alt="First">
        <img src="/images/menu.jpg" alt="Second">
      </body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      const pictureCount = (result.match(/<picture/g) || []).length;
      expect(pictureCount).toBe(2);
    });

    test("Transform processes local images while leaving external URLs unchanged", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body>
        <img src="https://example.com/external.jpg" alt="External">
        <img src="/images/party.jpg" alt="Local">
      </body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result.includes('src="https://example.com/external.jpg"')).toBe(
        true,
      );
      expect(result.includes("<picture")).toBe(true);
    });

    test("Transform returns content unchanged when no img tags present", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><p>No images here</p></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result).toBe(htmlContent);
    });

    test("Transform returns content unchanged when only non-local images present", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body><img src="/assets/logo.png" alt="Logo"></body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expect(result).toBe(htmlContent);
    });

    test("Transform efficiently reuses cached results for duplicate images", async () => {
      const transform = createImageTransform();
      const htmlContent = `<html><body>
        <img src="/images/party.jpg" alt="First occurrence">
        <img src="/images/party.jpg" alt="First occurrence">
      </body></html>`;
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

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
          files: [
            {
              path: "pages/test.md",
              frontmatter: {
                title: "Markdown Image Test",
                layout: "page",
                permalink: "/test/",
              },
              content: "![A test scene](/images/scene.jpg)",
            },
          ],
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

    test("Image shortcode used inline in paragraph produces valid HTML structure", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/test.md",
              frontmatter: {
                title: "Inline Image Test",
                layout: "page",
                permalink: "/test/",
              },
              content:
                'Check out this image: {% image "inline.jpg", "Inline test" %}',
            },
          ],
          images: [{ src: "src/images/party.jpg", dest: "inline.jpg" }],
        },
        (site) => {
          const html = site.getOutput("/test/index.html");

          expect(!html.includes("<p><div")).toBe(true);
          expect(html.includes("image-wrapper")).toBe(true);
        },
      );
    });
  });
});
