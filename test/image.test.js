import assert from "assert";
import {
  configureImages,
  copyImageCache,
  createImageTransform,
  createImagesCollection,
  findImageFiles,
  imageShortcode,
} from "../src/_lib/image.js";
import { createTestRunner } from "./test-utils.js";

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
];

export default createTestRunner("image", testCases);
