import { configureUnusedImages } from "#media/unused-images.js";
import {
  captureConsoleLogAsync,
  cleanupTempDir,
  createFrontmatter,
  createMockEleventyConfig,
  createTempDir,
  createTestRunner,
  expectTrue,
  fs,
  path,
} from "#test/test-utils.js";

/**
 * Helper to run unused images test with common setup/teardown.
 * @param {string} testName - Name for temp directory
 * @param {function} setup - Function(tempDir, imagesDir) to set up files
 * @param {function} assertion - Function(logs) to assert on captured logs
 */
const runUnusedImagesTest = async (testName, setup, assertion) => {
  const tempDir = createTempDir(`unused-images-${testName}`);
  const imagesDir = path.join(tempDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  if (setup) setup(tempDir, imagesDir);

  const mockConfig = createMockEleventyConfig();
  configureUnusedImages(mockConfig);

  const logs = await captureConsoleLogAsync(async () => {
    await mockConfig.eventHandlers["eleventy.after"]({
      dir: { input: tempDir },
    });
  });

  assertion(logs);
  cleanupTempDir(tempDir);
};

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
      await runUnusedImagesTest("empty", null, (logs) => {
        expectTrue(
          logs.some((log) => log.includes("No images found in /src/images/")),
          "Should log that no images were found",
        );
      });
    },
  },
  {
    name: "images-directory-non-image-files",
    description: "Ignores non-image files in images directory",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "non-image",
        (_tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "readme.txt"), "text file");
          fs.writeFileSync(path.join(imagesDir, "data.json"), "{}");
        },
        (logs) => {
          expectTrue(
            logs.some((log) => log.includes("No images found in /src/images/")),
            "Should log no images found when only non-image files exist",
          );
        },
      );
    },
  },
  {
    name: "all-images-used",
    description: "Reports all images used when all are referenced",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "all-used",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "photo.jpg"), "fake jpg");
          fs.writeFileSync(path.join(imagesDir, "banner.png"), "fake png");
          fs.writeFileSync(
            path.join(tempDir, "page1.md"),
            "![Photo](/images/photo.jpg)",
          );
          fs.writeFileSync(
            path.join(tempDir, "page2.md"),
            "![Banner](images/banner.png)",
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should report all images are used",
          );
        },
      );
    },
  },
  {
    name: "some-unused-images",
    description: "Reports unused images when some are not referenced",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "some-unused",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "used.jpg"), "fake jpg");
          fs.writeFileSync(path.join(imagesDir, "unused.png"), "fake png");
          fs.writeFileSync(path.join(imagesDir, "also-unused.gif"), "fake gif");
          fs.writeFileSync(
            path.join(tempDir, "page.md"),
            "![Used](/images/used.jpg)",
          );
        },
        (logs) => {
          const logOutput = logs.join("\n");
          expectTrue(
            logOutput.includes("Unused Images Report"),
            "Should show report",
          );
          expectTrue(
            logOutput.includes("unused.png"),
            "Should list unused.png",
          );
          expectTrue(
            logOutput.includes("also-unused.gif"),
            "Should list also-unused.gif",
          );
          expectTrue(
            logOutput.includes("Found 2 unused image(s)"),
            "Should report count",
          );
        },
      );
    },
  },
  {
    name: "various-image-extensions",
    description:
      "Detects images with various extensions (jpg, jpeg, png, gif, webp, svg)",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "extensions",
        (_tempDir, imagesDir) => {
          for (const ext of [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "svg",
            "JPG",
          ]) {
            fs.writeFileSync(path.join(imagesDir, `test.${ext}`), "fake");
          }
        },
        (logs) => {
          expectTrue(
            logs.join("\n").includes("Found 7 unused image(s)"),
            "Should detect all 7 image files with various extensions",
          );
        },
      );
    },
  },
  {
    name: "nested-markdown-files",
    description: "Scans markdown files in nested directories",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "nested-md",
        (tempDir, imagesDir) => {
          const nestedDir = path.join(tempDir, "content", "blog");
          fs.mkdirSync(nestedDir, { recursive: true });
          fs.writeFileSync(path.join(imagesDir, "nested-ref.jpg"), "fake jpg");
          fs.writeFileSync(
            path.join(nestedDir, "post.md"),
            "![Image](/images/nested-ref.jpg)",
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should find image reference in nested markdown",
          );
        },
      );
    },
  },
  {
    name: "image-reference-without-path",
    description: "Detects image references by filename without path prefix",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "no-path",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "direct-ref.png"), "fake png");
          fs.writeFileSync(
            path.join(tempDir, "page.md"),
            "Some text with direct-ref.png in it",
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should detect image reference by filename alone",
          );
        },
      );
    },
  },
  {
    name: "multiple-references-same-image",
    description: "Handles multiple references to the same image",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "multi-ref",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "shared.jpg"), "fake jpg");
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
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should count image as used even with multiple references",
          );
        },
      );
    },
  },
  {
    name: "case-insensitive-extension",
    description: "Detects images with uppercase extensions",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "case",
        (_tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "upper.PNG"), "fake png");
          fs.writeFileSync(path.join(imagesDir, "mixed.JpG"), "fake jpg");
        },
        (logs) => {
          const logOutput = logs.join("\n");
          expectTrue(
            logOutput.includes("upper.PNG"),
            "Should detect .PNG extension",
          );
          expectTrue(
            logOutput.includes("mixed.JpG"),
            "Should detect .JpG extension",
          );
        },
      );
    },
  },
  {
    name: "frontmatter-header-image",
    description: "Detects images referenced in header_image frontmatter field",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "frontmatter-header",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "banner.jpg"), "fake jpg");
          fs.writeFileSync(
            path.join(tempDir, "page.md"),
            createFrontmatter(
              { header_image: "src/images/banner.jpg" },
              "# Page",
            ),
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should detect header_image reference in frontmatter",
          );
        },
      );
    },
  },
  {
    name: "frontmatter-image-field",
    description: "Detects images referenced in image frontmatter field",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "frontmatter-image",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "profile.png"), "fake png");
          fs.writeFileSync(
            path.join(tempDir, "team.md"),
            createFrontmatter({ image: "profile.png" }, "# Team member"),
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should detect image reference in frontmatter",
          );
        },
      );
    },
  },
  {
    name: "frontmatter-thumbnail-field",
    description: "Detects images referenced in thumbnail frontmatter field",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "frontmatter-thumb",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "thumb.webp"), "fake webp");
          fs.writeFileSync(
            path.join(tempDir, "post.md"),
            createFrontmatter(
              { thumbnail: "/images/thumb.webp" },
              "# Blog post",
            ),
          );
        },
        (logs) => {
          expectTrue(
            logs.some((log) =>
              log.includes("All images in /src/images/ are being used"),
            ),
            "Should detect thumbnail reference in frontmatter",
          );
        },
      );
    },
  },
  {
    name: "frontmatter-and-content-images",
    description: "Detects images in both frontmatter and content",
    asyncTest: async () => {
      await runUnusedImagesTest(
        "both",
        (tempDir, imagesDir) => {
          fs.writeFileSync(path.join(imagesDir, "header.jpg"), "fake jpg");
          fs.writeFileSync(path.join(imagesDir, "inline.png"), "fake png");
          fs.writeFileSync(path.join(imagesDir, "unused.gif"), "fake gif");
          fs.writeFileSync(
            path.join(tempDir, "page.md"),
            createFrontmatter(
              { header_image: "header.jpg" },
              "![Inline](/images/inline.png)",
            ),
          );
        },
        (logs) => {
          const logOutput = logs.join("\n");
          expectTrue(
            logOutput.includes("Found 1 unused image(s)"),
            "Should find 1 unused",
          );
          expectTrue(
            logOutput.includes("unused.gif"),
            "Should report unused.gif",
          );
        },
      );
    },
  },
];

export default createTestRunner("unused-images", testCases);
