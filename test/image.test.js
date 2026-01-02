import {
  configureImages,
  copyImageCache,
  createImagesCollection,
  createImageTransform,
  findImageFiles,
  imageShortcode,
} from "#media/image.js";
import { withTestSite } from "#test/test-site-factory.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // ============================================
  // findImageFiles tests
  // ============================================
  {
    name: "findImageFiles-returns-array",
    description: "findImageFiles returns an array for any input",
    test: () => {
      const result = findImageFiles([]);
      expectTrue(
        Array.isArray(result),
        "findImageFiles should return an array even for empty pattern",
      );
    },
  },
  {
    name: "findImageFiles-custom-pattern",
    description: "findImageFiles accepts custom file patterns without throwing",
    test: () => {
      const customPattern = ["test/fixtures/*.png"];
      const result = findImageFiles(customPattern);
      expectTrue(
        Array.isArray(result),
        "findImageFiles should return an array for custom patterns",
      );
    },
  },

  // ============================================
  // createImagesCollection tests
  // ============================================
  {
    name: "createImagesCollection-extracts-filenames",
    description: "Extracts filenames from paths and reverses order",
    test: () => {
      const imageFiles = [
        "src/images/photo1.jpg",
        "src/images/photo2.jpg",
        "src/images/banner.jpg",
      ];

      const result = createImagesCollection(imageFiles);

      expectDeepEqual(
        result,
        ["banner.jpg", "photo2.jpg", "photo1.jpg"],
        "Should extract filenames and reverse order for newest-first display",
      );
    },
  },
  {
    name: "createImagesCollection-empty-array",
    description: "Returns empty array for empty input",
    test: () => {
      const result = createImagesCollection([]);

      expectDeepEqual(
        result,
        [],
        "Should return empty array when no images provided",
      );
    },
  },
  {
    name: "createImagesCollection-null-input",
    description: "Returns empty array when input is null",
    test: () => {
      const result = createImagesCollection(null);

      expectDeepEqual(
        result,
        [],
        "Should gracefully handle null input by returning empty array",
      );
    },
  },
  {
    name: "createImagesCollection-undefined-input",
    description: "Returns empty array when input is undefined",
    test: () => {
      const result = createImagesCollection(undefined);

      expectDeepEqual(
        result,
        [],
        "Should gracefully handle undefined input by returning empty array",
      );
    },
  },
  {
    name: "createImagesCollection-various-path-structures",
    description: "Extracts filename regardless of directory structure",
    test: () => {
      const imageFiles = ["assets/imgs/test.jpg", "public/photos/vacation.jpg"];

      const result = createImagesCollection(imageFiles);

      expectDeepEqual(
        result,
        ["vacation.jpg", "test.jpg"],
        "Should extract filename from any path structure",
      );
    },
  },
  {
    name: "createImagesCollection-immutable",
    description: "Does not modify input array",
    test: () => {
      const originalFiles = ["src/images/test1.jpg", "src/images/test2.jpg"];
      const filesCopy = [...originalFiles];

      createImagesCollection(filesCopy);

      expectDeepEqual(
        filesCopy,
        originalFiles,
        "Input array should not be modified by createImagesCollection",
      );
    },
  },
  {
    name: "createImagesCollection-consistent-results",
    description: "Returns consistent results for identical inputs",
    test: () => {
      const files = ["src/images/test1.jpg", "src/images/test2.jpg"];

      const result1 = createImagesCollection(files);
      const result2 = createImagesCollection(files);

      expectDeepEqual(
        result1,
        result2,
        "Should produce identical results for same input",
      );
      expectTrue(
        result1 !== result2,
        "Should create new array instance each time (not return same reference)",
      );
    },
  },

  // ============================================
  // copyImageCache tests
  // ============================================
  {
    name: "copyImageCache-does-not-throw",
    description:
      "copyImageCache runs without throwing even if cache directory missing",
    test: () => {
      // If this throws, the test framework will catch it and fail the test
      copyImageCache();
      expectTrue(true, "copyImageCache should complete without throwing");
    },
  },

  // ============================================
  // createImageTransform tests
  // ============================================
  {
    name: "createImageTransform-returns-function",
    description: "createImageTransform returns a transform function",
    test: () => {
      const transform = createImageTransform();

      expectFunctionType(
        transform,
        undefined,
        "createImageTransform should return a function",
      );
    },
  },
  {
    name: "createImageTransform-css-passthrough",
    description: "Transform passes through CSS files unchanged",
    asyncTest: async () => {
      const transform = createImageTransform();
      const cssContent = "body { margin: 0; }";
      const cssPath = "/test/style.css";

      const result = await transform(cssContent, cssPath);

      expectStrictEqual(
        result,
        cssContent,
        "CSS files should pass through unchanged - no image processing needed",
      );
    },
  },
  {
    name: "createImageTransform-null-path-passthrough",
    description: "Transform passes through content when output path is null",
    asyncTest: async () => {
      const transform = createImageTransform();
      const content = "<p>Test content</p>";

      const result = await transform(content, null);

      expectStrictEqual(
        result,
        content,
        "Content should pass through when no output path provided",
      );
    },
  },
  {
    name: "createImageTransform-feed-xml-passthrough",
    description: "Transform passes through feed.xml files without processing",
    asyncTest: async () => {
      const transform = createImageTransform();
      const feedContent =
        '<?xml version="1.0"?><feed><entry>test</entry></feed>';
      const feedPath = "/test/feed.xml";

      const result = await transform(feedContent, feedPath);

      expectStrictEqual(
        result,
        feedContent,
        "Feed XML files should pass through unchanged",
      );
    },
  },
  {
    name: "createImageTransform-feed-json-passthrough",
    description: "Transform passes through feed.json files without processing",
    asyncTest: async () => {
      const transform = createImageTransform();
      const feedContent = '{"items": []}';
      const feedPath = "/test/feed.json";

      const result = await transform(feedContent, feedPath);

      expectStrictEqual(
        result,
        feedContent,
        "Feed JSON files should pass through unchanged",
      );
    },
  },
  {
    name: "createImageTransform-html-without-images-passthrough",
    description: "Transform passes through HTML without img tags",
    asyncTest: async () => {
      const transform = createImageTransform();
      const htmlContent = "<html><body><p>Hello world</p></body></html>";
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expectStrictEqual(
        result,
        htmlContent,
        "HTML without images should pass through unchanged",
      );
    },
  },
  {
    name: "createImageTransform-external-images-passthrough",
    description: "Transform passes through HTML with only external image URLs",
    asyncTest: async () => {
      const transform = createImageTransform();
      const htmlContent =
        '<html><body><img src="https://example.com/image.jpg" alt="test"></body></html>';
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      expectStrictEqual(
        result,
        htmlContent,
        "HTML with external images should pass through - only local images need processing",
      );
    },
  },

  // ============================================
  // configureImages tests
  // ============================================
  {
    name: "configureImages-registers-shortcode",
    description: "Registers async image shortcode with Eleventy config",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expectTrue(
        "image" in mockConfig.asyncShortcodes,
        "Should register 'image' as an async shortcode",
      );
      expectFunctionType(
        mockConfig.asyncShortcodes,
        "image",
        "image shortcode should be a function",
      );
    },
  },
  {
    name: "configureImages-registers-transform",
    description: "Registers processImages transform with Eleventy config",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expectTrue(
        "processImages" in mockConfig.transforms,
        "Should register 'processImages' transform",
      );
      expectFunctionType(
        mockConfig.transforms,
        "processImages",
        "processImages transform should be a function",
      );
    },
  },
  {
    name: "configureImages-registers-collection",
    description: "Registers images collection with Eleventy config",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expectTrue(
        "images" in mockConfig.collections,
        "Should register 'images' collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "images",
        "images collection should be a function",
      );
    },
  },
  {
    name: "configureImages-registers-event-handler",
    description: "Registers eleventy.after event handler for cache copying",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expectTrue(
        mockConfig.eventHandlers !== undefined &&
          "eleventy.after" in mockConfig.eventHandlers,
        "Should register 'eleventy.after' event handler for image cache",
      );
      expectFunctionType(
        mockConfig.eventHandlers,
        "eleventy.after",
        "eleventy.after handler should be a function",
      );
    },
  },
  {
    name: "configureImages-adds-plugin",
    description: "Adds eleventy-img plugin to config",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      expectTrue(
        mockConfig.pluginCalls && mockConfig.pluginCalls.length > 0,
        "Should add at least one plugin (eleventy-img)",
      );
    },
  },
  {
    name: "configureImages-collection-returns-array",
    description: "Images collection function returns an array",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureImages(mockConfig);

      const collectionFn = mockConfig.collections.images;
      const result = collectionFn();

      expectTrue(
        Array.isArray(result),
        "images collection function should return an array of image filenames",
      );
    },
  },

  // ============================================
  // imageShortcode tests - external URLs
  // ============================================
  {
    name: "imageShortcode-external-https-returns-img-tag",
    description:
      "Returns simple img tag for external HTTPS URLs without processing",
    asyncTest: async () => {
      const externalUrl = "https://example.com/image.jpg";
      const alt = "External image";

      const result = await imageShortcode(externalUrl, alt);

      expectTrue(
        result.includes("<img"),
        "Should return an img tag for external URL",
      );
      expectTrue(
        result.includes('src="https://example.com/image.jpg"'),
        "Should preserve original external URL in src attribute",
      );
      expectTrue(
        result.includes('alt="External image"'),
        "Should include provided alt text",
      );
      expectTrue(
        result.includes('loading="lazy"'),
        "Should include lazy loading by default",
      );
      expectTrue(
        result.includes('decoding="async"'),
        "Should include async decoding for performance",
      );
      expectTrue(
        !result.includes("image-wrapper"),
        "Should not wrap external images in image-wrapper div",
      );
      expectTrue(
        !result.includes("background-image"),
        "Should not include base64 placeholder for external images",
      );
    },
  },
  {
    name: "imageShortcode-external-http-returns-img-tag",
    description:
      "Returns simple img tag for external HTTP URLs without processing",
    asyncTest: async () => {
      const externalUrl = "http://example.com/image.jpg";
      const alt = "HTTP image";

      const result = await imageShortcode(externalUrl, alt);

      expectTrue(
        result.includes("<img"),
        "Should return an img tag for HTTP URL",
      );
      expectTrue(
        result.includes('src="http://example.com/image.jpg"'),
        "Should preserve original HTTP URL (not upgrade to HTTPS)",
      );
      expectTrue(
        result.includes('alt="HTTP image"'),
        "Should include provided alt text",
      );
    },
  },
  {
    name: "imageShortcode-external-url-with-classes",
    description: "Includes custom classes on external URL img tags",
    asyncTest: async () => {
      const externalUrl = "https://example.com/image.jpg";
      const result = await imageShortcode(
        externalUrl,
        "Test",
        null,
        "my-custom-class",
      );

      expectTrue(
        result.includes('class="my-custom-class"'),
        "Should apply custom classes to external image img tag",
      );
    },
  },
  {
    name: "imageShortcode-external-url-empty-alt",
    description: "Handles empty alt text for external URLs (decorative images)",
    asyncTest: async () => {
      const externalUrl = "https://example.com/image.jpg";

      const result = await imageShortcode(externalUrl, "");

      expectTrue(
        result.includes('alt=""'),
        "Should include empty alt attribute for decorative images",
      );
    },
  },
  {
    name: "imageShortcode-external-url-eager-loading",
    description: "External URL respects custom loading attribute",
    asyncTest: async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      expectTrue(
        result.includes('loading="eager"'),
        "Should use eager loading when specified for above-fold images",
      );
    },
  },

  // ============================================
  // imageShortcode tests - local images
  // ============================================
  {
    name: "imageShortcode-local-image-wrapped",
    description:
      "Processes local image and returns wrapped HTML with picture element",
    asyncTest: async () => {
      const result = await imageShortcode("party.jpg", "A party scene");

      expectTrue(
        result.includes("image-wrapper"),
        "Should wrap local images in image-wrapper div for LQIP",
      );
      expectTrue(
        result.includes("<picture"),
        "Should generate picture element with multiple formats",
      );
      expectTrue(
        result.includes('alt="A party scene"'),
        "Should include alt text in final img tag",
      );
      expectTrue(
        result.includes("aspect-ratio"),
        "Should include aspect ratio style for layout stability",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-classes",
    description: "Applies custom classes to image wrapper",
    asyncTest: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        "my-class another-class",
      );

      expectTrue(
        result.includes("image-wrapper my-class another-class"),
        "Should include custom classes on wrapper div",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-widths",
    description: "Processes local image with custom responsive widths",
    asyncTest: async () => {
      const result = await imageShortcode("party.jpg", "Test", "300,600");

      expectTrue(
        result.includes("<picture"),
        "Should generate picture element with specified widths",
      );
      expectTrue(result.includes("image-wrapper"), "Should wrap in div");
    },
  },
  {
    name: "imageShortcode-local-image-with-sizes",
    description: "Processes local image with custom sizes attribute",
    asyncTest: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        "(max-width: 600px) 100vw, 50vw",
      );

      expectTrue(
        result.includes("(max-width: 600px) 100vw, 50vw"),
        "Should include custom sizes attribute for responsive behavior",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-aspect-ratio",
    description: "Uses provided aspect ratio instead of calculated",
    asyncTest: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        "16/9",
      );

      expectTrue(
        result.includes("aspect-ratio: 16/9"),
        "Should use provided aspect ratio for layout",
      );
    },
  },
  {
    name: "imageShortcode-local-image-eager-loading",
    description: "Processes local image with eager loading for LCP images",
    asyncTest: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      expectTrue(
        result.includes('loading="eager"'),
        "Should use eager loading for above-fold/LCP images",
      );
    },
  },
  {
    name: "imageShortcode-widths-as-array",
    description: "Accepts widths as array instead of comma-separated string",
    asyncTest: async () => {
      const result = await imageShortcode("party.jpg", "Test", [320, 640]);

      expectTrue(
        result.includes("<picture"),
        "Should process image when widths provided as array",
      );
    },
  },

  // ============================================
  // imageShortcode tests - path normalization
  // ============================================
  {
    name: "imageShortcode-path-with-leading-slash",
    description: "Handles image path starting with /",
    asyncTest: async () => {
      const result = await imageShortcode("/images/party.jpg", "Test");

      expectTrue(
        result.includes("image-wrapper"),
        "Should process image with leading slash path",
      );
      expectTrue(
        result.includes("<picture"),
        "Should generate picture element",
      );
    },
  },
  {
    name: "imageShortcode-path-with-src-prefix",
    description: "Handles image path starting with src/",
    asyncTest: async () => {
      const result = await imageShortcode("src/images/party.jpg", "Test");

      expectTrue(
        result.includes("image-wrapper"),
        "Should process image with src/ prefix path",
      );
    },
  },
  {
    name: "imageShortcode-path-with-images-prefix",
    description: "Handles image path starting with images/",
    asyncTest: async () => {
      const result = await imageShortcode("images/party.jpg", "Test");

      expectTrue(
        result.includes("image-wrapper"),
        "Should process image with images/ prefix path",
      );
    },
  },

  // ============================================
  // imageShortcode tests - error handling
  // ============================================
  {
    name: "imageShortcode-invalid-path-throws",
    description: "Throws descriptive error for non-existent image",
    asyncTest: async () => {
      let errorThrown = false;
      let errorMessage = "";

      try {
        await imageShortcode("nonexistent-image-12345.jpg", "Test");
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
      }

      expectTrue(
        errorThrown,
        "Should throw error when image file does not exist",
      );
      expectTrue(
        errorMessage.length > 0,
        "Error should have a descriptive message",
      );
    },
  },

  // ============================================
  // imageShortcode tests - caching
  // ============================================
  {
    name: "imageShortcode-caching-consistent",
    description: "Returns identical cached result for same inputs",
    asyncTest: async () => {
      const result1 = await imageShortcode("menu.jpg", "Menu image");
      const result2 = await imageShortcode("menu.jpg", "Menu image");

      expectStrictEqual(
        result1,
        result2,
        "Same inputs should return identical cached output",
      );
    },
  },

  // ============================================
  // Integration tests using test-site-factory
  // ============================================
  // These tests create isolated Eleventy sites, copy real images,
  // build them, and verify image processing works end-to-end.

  {
    name: "integration-image-shortcode-processes-local-image",
    description:
      "Image shortcode processes local images in full Eleventy build",
    asyncTest: () =>
      withTestSite(
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
          expectTrue(
            html.includes("<picture"),
            "Should generate picture element from image shortcode",
          );
          expectTrue(
            html.includes('alt="A test image"'),
            "Should include alt text in processed image",
          );
          expectTrue(
            html.includes("image-wrapper"),
            "Should wrap processed image in image-wrapper div",
          );

          // Verify responsive images were generated
          const sources = doc.querySelectorAll("picture source");
          expectTrue(
            sources.length > 0,
            "Should generate source elements for responsive images",
          );

          // Verify webp format was generated
          const webpSource = doc.querySelector(
            'picture source[type="image/webp"]',
          );
          expectTrue(
            webpSource !== null,
            "Should generate WebP format for modern browsers",
          );
        },
      ),
  },

  {
    name: "integration-image-shortcode-external-url-passthrough",
    description: "External image URLs pass through without processing in build",
    asyncTest: async () => {
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
          expectTrue(
            html.includes('src="https://example.com/photo.jpg"'),
            "Should preserve external URL in src attribute",
          );
          expectTrue(
            html.includes('alt="External photo"'),
            "Should include alt text for external image",
          );
          expectTrue(
            !html.includes("<picture"),
            "Should not wrap external images in picture element",
          );
        },
      );
    },
  },

  {
    name: "integration-images-collection-finds-images",
    description: "Images collection returns image filenames from src/images",
    asyncTest: () =>
      withTestSite(
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

          expectTrue(
            html.includes("alpha.jpg"),
            "Should include alpha.jpg in images collection",
          );
          expectTrue(
            html.includes("beta.jpg"),
            "Should include beta.jpg in images collection",
          );
        },
      ),
  },

  {
    name: "integration-image-with-custom-widths",
    description: "Image shortcode respects custom width parameter in build",
    asyncTest: () =>
      withTestSite(
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

          expectTrue(
            html.includes("<picture"),
            "Should generate picture element with custom widths",
          );

          // Verify srcset contains the specified widths
          const sources = doc.querySelectorAll("picture source");
          const hasSrcset = Array.from(sources).some(
            (s) => s.getAttribute("srcset") !== null,
          );
          expectTrue(
            hasSrcset,
            "Should generate srcset with responsive image widths",
          );
        },
      ),
  },
];

export default createTestRunner("image", testCases);
