import assert from "node:assert";
import {
  configureImages,
  copyImageCache,
  createImagesCollection,
  createImageTransform,
  findImageFiles,
  imageShortcode,
} from "#media/image.js";
import { createTestRunner } from "#test/test-utils.js";

const mockEleventyConfig = {
  addAsyncShortcode: function (name, fn) {
    this.shortcodes = this.shortcodes || {};
    this.shortcodes[name] = fn;
  },
  addTransform: function (name, fn) {
    this.transforms = this.transforms || {};
    this.transforms[name] = fn;
  },
  addCollection: function (name, fn) {
    this.collections = this.collections || {};
    this.collections[name] = fn;
  },
  addPlugin: function (plugin) {
    this.plugins = this.plugins || [];
    this.plugins.push(plugin);
  },
  on: function (event, fn) {
    this.events = this.events || {};
    this.events[event] = fn;
  },
};

const testCases = [
  {
    name: "findImageFiles-default-pattern",
    description: "Finds image files with default pattern",
    test: () => {
      // We can't test actual file finding without setup, but we can test the function exists
      assert.strictEqual(
        typeof findImageFiles,
        "function",
        "Should be a function",
      );

      const result = findImageFiles([]); // Empty pattern
      assert(Array.isArray(result), "Should return an array");
    },
  },
  {
    name: "findImageFiles-custom-pattern",
    description: "Accepts custom file patterns",
    test: () => {
      const customPattern = ["test/fixtures/*.png"];
      const result = findImageFiles(customPattern);

      assert(
        Array.isArray(result),
        "Should return an array for custom pattern",
      );
    },
  },
  {
    name: "createImagesCollection-basic",
    description: "Creates image collection from file list",
    test: () => {
      const imageFiles = [
        "src/images/photo1.jpg",
        "src/images/photo2.jpg",
        "src/images/banner.jpg",
      ];

      const result = createImagesCollection(imageFiles);

      assert.deepStrictEqual(
        result,
        ["banner.jpg", "photo2.jpg", "photo1.jpg"],
        "Should extract filenames and reverse order",
      );
    },
  },
  {
    name: "createImagesCollection-empty",
    description: "Handles empty image file list",
    test: () => {
      const result = createImagesCollection([]);

      assert.deepStrictEqual(
        result,
        [],
        "Should return empty array for empty input",
      );
    },
  },
  {
    name: "createImagesCollection-different-paths",
    description: "Handles different path structures",
    test: () => {
      const imageFiles = ["assets/imgs/test.jpg", "public/photos/vacation.jpg"];

      const result = createImagesCollection(imageFiles);

      assert.deepStrictEqual(
        result,
        ["vacation.jpg", "test.jpg"],
        "Should extract filename regardless of path structure",
      );
    },
  },
  {
    name: "copyImageCache-function-exists",
    description: "copyImageCache function exists and is callable",
    test: () => {
      assert.strictEqual(
        typeof copyImageCache,
        "function",
        "Should be a function",
      );

      // Test that it doesn't throw when called (even if .image-cache doesn't exist)
      assert.doesNotThrow(() => {
        copyImageCache();
      }, "Should not throw when called");
    },
  },
  {
    name: "createImageTransform-basic",
    description: "Creates image transform function",
    test: () => {
      const transform = createImageTransform();

      assert.strictEqual(
        typeof transform,
        "function",
        "Should return a function",
      );
    },
  },
  {
    name: "createImageTransform-non-html-passthrough",
    description: "Transform passes through non-HTML files",
    test: async () => {
      const transform = createImageTransform();

      const cssContent = "body { margin: 0; }";
      const cssPath = "/test/style.css";

      const result = await transform(cssContent, cssPath);

      assert.strictEqual(
        result,
        cssContent,
        "Should pass through CSS files unchanged",
      );
    },
  },
  {
    name: "createImageTransform-no-output-path",
    description: "Transform handles missing output path",
    test: async () => {
      const transform = createImageTransform();

      const content = "<p>Test content</p>";

      const result = await transform(content, null);

      assert.strictEqual(
        result,
        content,
        "Should pass through content when no output path",
      );
    },
  },
  {
    name: "configureImages-basic",
    description: "Configures all image functionality in Eleventy",
    test: () => {
      const mockConfig = { ...mockEleventyConfig };

      configureImages(mockConfig);

      // Verify shortcode
      assert(mockConfig.shortcodes.image, "Should add image shortcode");
      assert.strictEqual(
        typeof mockConfig.shortcodes.image,
        "function",
        "Should add function shortcode",
      );

      // Verify transform
      assert(
        mockConfig.transforms.processImages,
        "Should add processImages transform",
      );
      assert.strictEqual(
        typeof mockConfig.transforms.processImages,
        "function",
        "Should add function transform",
      );

      // Verify collection
      assert(mockConfig.collections.images, "Should add images collection");
      assert.strictEqual(
        typeof mockConfig.collections.images,
        "function",
        "Should add function collection",
      );

      // Verify event handler
      assert(
        mockConfig.events["eleventy.after"],
        "Should add eleventy.after event handler",
      );
      assert.strictEqual(
        typeof mockConfig.events["eleventy.after"],
        "function",
        "Should add function event handler",
      );
    },
  },
  {
    name: "configureImages-collection-function",
    description: "Images collection function works correctly",
    test: () => {
      const mockConfig = { ...mockEleventyConfig };

      configureImages(mockConfig);

      const collectionFn = mockConfig.collections.images;
      const result = collectionFn();

      assert(
        Array.isArray(result),
        "Collection function should return an array",
      );
    },
  },
  {
    name: "image-functions-pure",
    description: "Image utility functions should be pure",
    test: () => {
      const originalFiles = ["src/images/test1.jpg", "src/images/test2.jpg"];
      const filesCopy = [...originalFiles];

      const result1 = createImagesCollection(filesCopy);
      const result2 = createImagesCollection(filesCopy);

      // Verify inputs unchanged
      assert.deepStrictEqual(
        filesCopy,
        originalFiles,
        "Should not modify input array",
      );

      // Verify consistent results
      assert.deepStrictEqual(
        result1,
        result2,
        "Should produce consistent results",
      );

      // Verify results are new arrays
      assert.notStrictEqual(
        result1,
        result2,
        "Should create new result arrays",
      );
    },
  },
  {
    name: "image-module-integration",
    description: "All image functions work together correctly",
    test: () => {
      // Test the workflow: find files -> create collection -> configure
      const mockFiles = ["src/images/a.jpg", "src/images/b.jpg"];
      const collection = createImagesCollection(mockFiles);

      assert.deepStrictEqual(
        collection,
        ["b.jpg", "a.jpg"],
        "Should process files correctly",
      );

      const mockConfig = { ...mockEleventyConfig };
      configureImages(mockConfig);

      // Verify all components are configured
      assert(mockConfig.shortcodes.image, "Should configure shortcode");
      assert(mockConfig.transforms.processImages, "Should configure transform");
      assert(mockConfig.collections.images, "Should configure collection");
      assert(
        mockConfig.events["eleventy.after"],
        "Should configure event handler",
      );
    },
  },
  {
    name: "imageShortcode-external-https-url",
    description:
      "Returns simple img tag for external HTTPS URLs without processing",
    test: async () => {
      const externalUrl = "https://example.com/image.jpg";
      const alt = "External image";

      const result = await imageShortcode(externalUrl, alt);

      assert(result.includes("<img"), "Should return an img tag");
      assert(
        result.includes('src="https://example.com/image.jpg"'),
        "Should preserve original URL",
      );
      assert(
        result.includes('alt="External image"'),
        "Should include alt text",
      );
      assert(result.includes('loading="lazy"'), "Should include lazy loading");
      assert(
        result.includes('decoding="async"'),
        "Should include async decoding",
      );
      assert(
        !result.includes("image-wrapper"),
        "Should not wrap in image-wrapper div",
      );
      assert(
        !result.includes("background-image"),
        "Should not include base64 placeholder",
      );
    },
  },
  {
    name: "imageShortcode-external-http-url",
    description:
      "Returns simple img tag for external HTTP URLs without processing",
    test: async () => {
      const externalUrl = "http://example.com/image.jpg";
      const alt = "HTTP image";

      const result = await imageShortcode(externalUrl, alt);

      assert(result.includes("<img"), "Should return an img tag");
      assert(
        result.includes('src="http://example.com/image.jpg"'),
        "Should preserve original HTTP URL",
      );
      assert(result.includes('alt="HTTP image"'), "Should include alt text");
    },
  },
  {
    name: "imageShortcode-external-url-with-classes",
    description: "Includes classes on external URL img tags",
    test: async () => {
      const externalUrl = "https://example.com/image.jpg";
      const alt = "Test";
      const widths = null;
      const classes = "my-custom-class";

      const result = await imageShortcode(externalUrl, alt, widths, classes);

      assert(
        result.includes('class="my-custom-class"'),
        "Should include custom classes",
      );
    },
  },
  {
    name: "imageShortcode-external-url-empty-alt",
    description: "Handles empty alt text for external URLs",
    test: async () => {
      const externalUrl = "https://example.com/image.jpg";

      const result = await imageShortcode(externalUrl, "");

      assert(result.includes('alt=""'), "Should include empty alt attribute");
    },
  },
  {
    name: "createImagesCollection-null-input",
    description: "Returns empty array when input is null",
    test: () => {
      const result = createImagesCollection(null);

      assert.deepStrictEqual(
        result,
        [],
        "Should return empty array for null input",
      );
    },
  },
  {
    name: "createImagesCollection-undefined-input",
    description: "Returns empty array when input is undefined",
    test: () => {
      const result = createImagesCollection(undefined);

      assert.deepStrictEqual(
        result,
        [],
        "Should return empty array for undefined input",
      );
    },
  },
  {
    name: "createImageTransform-feed-passthrough",
    description: "Transform passes through feed.xml files without processing",
    test: async () => {
      const transform = createImageTransform();

      const feedContent = '<?xml version="1.0"?><feed><entry>test</entry></feed>';
      const feedPath = "/test/feed.xml";

      const result = await transform(feedContent, feedPath);

      assert.strictEqual(
        result,
        feedContent,
        "Should pass through feed files unchanged",
      );
    },
  },
  {
    name: "createImageTransform-feed-json-passthrough",
    description: "Transform passes through feed.json files without processing",
    test: async () => {
      const transform = createImageTransform();

      const feedContent = '{"items": []}';
      const feedPath = "/test/feed.json";

      const result = await transform(feedContent, feedPath);

      assert.strictEqual(
        result,
        feedContent,
        "Should pass through feed.json files unchanged",
      );
    },
  },
  {
    name: "createImageTransform-html-without-images",
    description: "Transform passes through HTML without img tags",
    test: async () => {
      const transform = createImageTransform();

      const htmlContent = "<html><body><p>Hello world</p></body></html>";
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      assert.strictEqual(
        result,
        htmlContent,
        "Should pass through HTML without images unchanged",
      );
    },
  },
  {
    name: "createImageTransform-html-with-external-images",
    description: "Transform passes through HTML with only external image URLs",
    test: async () => {
      const transform = createImageTransform();

      const htmlContent =
        '<html><body><img src="https://example.com/image.jpg" alt="test"></body></html>';
      const htmlPath = "/test/page.html";

      const result = await transform(htmlContent, htmlPath);

      assert.strictEqual(
        result,
        htmlContent,
        "Should pass through HTML with external images unchanged",
      );
    },
  },
  {
    name: "imageShortcode-local-image-basic",
    description: "Processes local image and returns wrapped HTML",
    test: async () => {
      const result = await imageShortcode("party.jpg", "A party scene");

      assert(result.includes("image-wrapper"), "Should wrap in image-wrapper div");
      assert(result.includes("<picture"), "Should generate picture element");
      assert(result.includes('alt="A party scene"'), "Should include alt text");
      assert(result.includes("aspect-ratio"), "Should include aspect ratio style");
    },
  },
  {
    name: "imageShortcode-local-image-with-classes",
    description: "Processes local image with custom classes",
    test: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        "my-class another-class",
      );

      assert(
        result.includes("image-wrapper my-class another-class"),
        "Should include custom classes on wrapper",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-widths",
    description: "Processes local image with custom widths",
    test: async () => {
      const result = await imageShortcode("party.jpg", "Test", "300,600");

      assert(result.includes("<picture"), "Should generate picture element");
      assert(result.includes("image-wrapper"), "Should wrap in div");
    },
  },
  {
    name: "imageShortcode-local-image-with-sizes",
    description: "Processes local image with custom sizes",
    test: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        "(max-width: 600px) 100vw, 50vw",
      );

      assert(
        result.includes("(max-width: 600px) 100vw, 50vw"),
        "Should include custom sizes",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-aspect-ratio",
    description: "Processes local image with custom aspect ratio",
    test: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        "16/9",
      );

      assert(
        result.includes("aspect-ratio: 16/9"),
        "Should use provided aspect ratio",
      );
    },
  },
  {
    name: "imageShortcode-local-image-with-eager-loading",
    description: "Processes local image with eager loading",
    test: async () => {
      const result = await imageShortcode(
        "party.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      assert(result.includes('loading="eager"'), "Should use eager loading");
    },
  },
  {
    name: "imageShortcode-path-starting-with-slash",
    description: "Handles image path starting with /",
    test: async () => {
      const result = await imageShortcode("/images/party.jpg", "Test");

      assert(result.includes("image-wrapper"), "Should process image with / prefix");
      assert(result.includes("<picture"), "Should generate picture element");
    },
  },
  {
    name: "imageShortcode-path-starting-with-src",
    description: "Handles image path starting with src/",
    test: async () => {
      const result = await imageShortcode("src/images/party.jpg", "Test");

      assert(
        result.includes("image-wrapper"),
        "Should process image with src/ prefix",
      );
    },
  },
  {
    name: "imageShortcode-path-starting-with-images",
    description: "Handles image path starting with images/",
    test: async () => {
      const result = await imageShortcode("images/party.jpg", "Test");

      assert(
        result.includes("image-wrapper"),
        "Should process image with images/ prefix",
      );
    },
  },
  {
    name: "imageShortcode-invalid-image-path",
    description: "Returns empty string for invalid image path",
    test: async () => {
      const result = await imageShortcode(
        "nonexistent-image-12345.jpg",
        "Test",
      );

      assert.strictEqual(
        result,
        "",
        "Should return empty string for invalid image path",
      );
    },
  },
  {
    name: "imageShortcode-caching",
    description: "Returns cached result for identical calls",
    test: async () => {
      // Make the same call twice
      const result1 = await imageShortcode("menu.jpg", "Menu image");
      const result2 = await imageShortcode("menu.jpg", "Menu image");

      assert.strictEqual(
        result1,
        result2,
        "Should return identical results for same inputs",
      );
    },
  },
  {
    name: "imageShortcode-widths-as-array",
    description: "Handles widths as array",
    test: async () => {
      const result = await imageShortcode("party.jpg", "Test", [320, 640]);

      assert(result.includes("<picture"), "Should process with array widths");
    },
  },
  {
    name: "imageShortcode-external-url-with-loading",
    description: "External URL respects custom loading attribute",
    test: async () => {
      const result = await imageShortcode(
        "https://example.com/image.jpg",
        "Test",
        null,
        null,
        null,
        null,
        "eager",
      );

      assert(result.includes('loading="eager"'), "Should use eager loading");
    },
  },
  {
    name: "configureImages-plugin-added",
    description: "Adds eleventy-img plugin",
    test: () => {
      const mockConfig = { ...mockEleventyConfig };

      configureImages(mockConfig);

      assert(
        mockConfig.plugins && mockConfig.plugins.length > 0,
        "Should add at least one plugin",
      );
    },
  },
];

export default createTestRunner("image", testCases);
