import { configureUnusedImages } from "#media/unused-images.js";
import {
  captureConsoleLogAsync,
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  createTestRunner,
  expectTrue,
  fs,
  path,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "configureUnusedImages-registers-handler",
    description: "Registers an eleventy.after event handler",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);
      expectTrue(
        typeof mockConfig.eventHandlers["eleventy.after"] === "function",
        "Should register eleventy.after handler",
      );
    },
  },
  {
    name: "no-images-directory",
    description: "Handles missing images directory gracefully",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-no-dir");

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) => log.includes("No images directory found")),
        "Should log that no images directory was found",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "empty-images-directory",
    description: "Handles empty images directory",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-empty");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) => log.includes("No images found in /src/images/")),
        "Should log that no images were found",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "images-directory-non-image-files",
    description: "Ignores non-image files in images directory",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-non-image");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });
      fs.writeFileSync(path.join(imagesDir, "readme.txt"), "text file");
      fs.writeFileSync(path.join(imagesDir, "data.json"), "{}");

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) => log.includes("No images found in /src/images/")),
        "Should log no images found when only non-image files exist",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "all-images-used",
    description: "Reports all images used when all are referenced",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-all-used");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      // Create image files
      fs.writeFileSync(path.join(imagesDir, "photo.jpg"), "fake jpg");
      fs.writeFileSync(path.join(imagesDir, "banner.png"), "fake png");

      // Create markdown files that reference the images
      fs.writeFileSync(
        path.join(tempDir, "page1.md"),
        "# Page 1\n![Photo](/images/photo.jpg)",
      );
      fs.writeFileSync(
        path.join(tempDir, "page2.md"),
        "# Page 2\n![Banner](images/banner.png)",
      );

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) =>
          log.includes("All images in /src/images/ are being used"),
        ),
        "Should report all images are used",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "some-unused-images",
    description: "Reports unused images when some are not referenced",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-some-unused");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      // Create image files
      fs.writeFileSync(path.join(imagesDir, "used.jpg"), "fake jpg");
      fs.writeFileSync(path.join(imagesDir, "unused.png"), "fake png");
      fs.writeFileSync(path.join(imagesDir, "also-unused.gif"), "fake gif");

      // Create markdown that only references used.jpg
      fs.writeFileSync(
        path.join(tempDir, "page.md"),
        "# Page\n![Used](/images/used.jpg)",
      );

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      const logOutput = logs.join("\n");

      expectTrue(
        logOutput.includes("Unused Images Report"),
        "Should show unused images report",
      );
      expectTrue(logOutput.includes("unused.png"), "Should list unused.png");
      expectTrue(
        logOutput.includes("also-unused.gif"),
        "Should list also-unused.gif",
      );
      expectTrue(
        logOutput.includes("Found 2 unused image(s)"),
        "Should report count of unused images",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "various-image-extensions",
    description:
      "Detects images with various extensions (jpg, jpeg, png, gif, webp, svg)",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-extensions");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      // Create various image types
      fs.writeFileSync(path.join(imagesDir, "test.jpg"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.jpeg"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.png"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.gif"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.webp"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.svg"), "fake");
      fs.writeFileSync(path.join(imagesDir, "test.JPG"), "fake"); // uppercase

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      const logOutput = logs.join("\n");

      expectTrue(
        logOutput.includes("Found 7 unused image(s)"),
        "Should detect all 7 image files with various extensions",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "nested-markdown-files",
    description: "Scans markdown files in nested directories",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-nested-md");
      const imagesDir = path.join(tempDir, "images");
      const nestedDir = path.join(tempDir, "content", "blog");
      fs.mkdirSync(imagesDir, { recursive: true });
      fs.mkdirSync(nestedDir, { recursive: true });

      // Create image file
      fs.writeFileSync(path.join(imagesDir, "nested-ref.jpg"), "fake jpg");

      // Create nested markdown that references the image
      fs.writeFileSync(
        path.join(nestedDir, "post.md"),
        "# Blog Post\n![Image](/images/nested-ref.jpg)",
      );

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) =>
          log.includes("All images in /src/images/ are being used"),
        ),
        "Should find image reference in nested markdown",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "image-reference-without-path",
    description: "Detects image references by filename without path prefix",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-no-path");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      fs.writeFileSync(path.join(imagesDir, "direct-ref.png"), "fake png");

      // Reference by filename only
      fs.writeFileSync(
        path.join(tempDir, "page.md"),
        "# Page\nSome text with direct-ref.png in it",
      );

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) =>
          log.includes("All images in /src/images/ are being used"),
        ),
        "Should detect image reference by filename alone",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "multiple-references-same-image",
    description: "Handles multiple references to the same image",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-multi-ref");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      fs.writeFileSync(path.join(imagesDir, "shared.jpg"), "fake jpg");

      // Multiple pages reference same image
      fs.writeFileSync(
        path.join(tempDir, "page1.md"),
        "![Shared](/images/shared.jpg)",
      );
      fs.writeFileSync(
        path.join(tempDir, "page2.md"),
        "![Shared](/images/shared.jpg)",
      );
      fs.writeFileSync(
        path.join(tempDir, "page3.md"),
        "![Shared](images/shared.jpg)",
      );

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      expectTrue(
        logs.some((log) =>
          log.includes("All images in /src/images/ are being used"),
        ),
        "Should count image as used even with multiple references",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "case-insensitive-extension",
    description: "Detects images with uppercase extensions",
    asyncTest: async () => {
      const tempDir = createTempDir("unused-images-case");
      const imagesDir = path.join(tempDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      fs.writeFileSync(path.join(imagesDir, "upper.PNG"), "fake png");
      fs.writeFileSync(path.join(imagesDir, "mixed.JpG"), "fake jpg");

      const mockConfig = createMockEleventyConfig();
      configureUnusedImages(mockConfig);

      const logs = await captureConsoleLogAsync(async () => {
        await mockConfig.eventHandlers["eleventy.after"]({
          dir: { input: tempDir },
        });
      });

      const logOutput = logs.join("\n");

      expectTrue(
        logOutput.includes("upper.PNG"),
        "Should detect .PNG extension",
      );
      expectTrue(
        logOutput.includes("mixed.JpG"),
        "Should detect .JpG extension",
      );

      cleanupTempDir(tempDir);
    },
  },
];

export default createTestRunner("unused-images", testCases);
