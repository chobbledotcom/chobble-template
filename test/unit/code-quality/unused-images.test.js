import { describe, expect, test } from "bun:test";
import { configureUnusedImages } from "#media/unused-images.js";
import {
  captureConsoleLogAsync,
  cleanupTempDir,
  createFrontmatter,
  createMockEleventyConfig,
  createTempDir,
  expectLogContains,
  fs,
  path,
} from "#test/test-utils.js";

/** Common assertion: all images are used */
const expectAllImagesUsed = expectLogContains(
  "All images in /src/images/ are being used",
);

/** Run eleventy.after handler and capture logs */
const runEleventyAfter = async (tempDir) => {
  const mockConfig = createMockEleventyConfig();
  configureUnusedImages(mockConfig);
  return captureConsoleLogAsync(async () => {
    await mockConfig.eventHandlers["eleventy.after"]({
      dir: { input: tempDir },
    });
  });
};

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

  const logs = await runEleventyAfter(tempDir);

  assertion(logs);
  cleanupTempDir(tempDir);
};

describe("unused-images", () => {
  test("Registers an eleventy.after event handler", () => {
    const mockConfig = createMockEleventyConfig();
    configureUnusedImages(mockConfig);
    expect(typeof mockConfig.eventHandlers["eleventy.after"]).toBe("function");
  });

  test("Handles missing images directory gracefully", async () => {
    const tempDir = createTempDir("unused-images-no-dir");
    const logs = await runEleventyAfter(tempDir);
    expect(logs.some((log) => log.includes("No images directory found"))).toBe(
      true,
    );
    cleanupTempDir(tempDir);
  });

  test("Handles empty images directory", async () => {
    await runUnusedImagesTest("empty", null, (logs) => {
      expect(
        logs.some((log) => log.includes("No images found in /src/images/")),
      ).toBe(true);
    });
  });

  test("Ignores non-image files in images directory", async () => {
    await runUnusedImagesTest(
      "non-image",
      (_tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "readme.txt"), "text file");
        fs.writeFileSync(path.join(imagesDir, "data.json"), "{}");
      },
      (logs) => {
        expect(
          logs.some((log) => log.includes("No images found in /src/images/")),
        ).toBe(true);
      },
    );
  });

  test("Reports all images used when all are referenced", async () => {
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
      expectAllImagesUsed,
    );
  });

  test("Reports unused images when some are not referenced", async () => {
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
        expect(logOutput.includes("Unused Images Report")).toBe(true);
        expect(logOutput.includes("unused.png")).toBe(true);
        expect(logOutput.includes("also-unused.gif")).toBe(true);
        expect(logOutput.includes("Found 2 unused images")).toBe(true);
      },
    );
  });

  test("Detects images with various extensions (jpg, jpeg, png, gif, webp, svg)", async () => {
    await runUnusedImagesTest(
      "extensions",
      (_tempDir, imagesDir) => {
        for (const ext of ["jpg", "jpeg", "png", "gif", "webp", "svg", "JPG"]) {
          fs.writeFileSync(path.join(imagesDir, `test.${ext}`), "fake");
        }
      },
      (logs) => {
        expect(logs.join("\n").includes("Found 7 unused images")).toBe(true);
      },
    );
  });

  test("Scans markdown files in nested directories", async () => {
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
      expectAllImagesUsed,
    );
  });

  test("Detects image references by filename without path prefix", async () => {
    await runUnusedImagesTest(
      "no-path",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "direct-ref.png"), "fake png");
        fs.writeFileSync(
          path.join(tempDir, "page.md"),
          "Some text with direct-ref.png in it",
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Handles multiple references to the same image", async () => {
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
      expectAllImagesUsed,
    );
  });

  test("Detects images with uppercase extensions", async () => {
    await runUnusedImagesTest(
      "case",
      (_tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "upper.PNG"), "fake png");
        fs.writeFileSync(path.join(imagesDir, "mixed.JpG"), "fake jpg");
      },
      (logs) => {
        const logOutput = logs.join("\n");
        expect(logOutput.includes("upper.PNG")).toBe(true);
        expect(logOutput.includes("mixed.JpG")).toBe(true);
      },
    );
  });

  test("Detects images referenced in header_image frontmatter field", async () => {
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
      expectAllImagesUsed,
    );
  });

  test("Detects images referenced in image frontmatter field", async () => {
    await runUnusedImagesTest(
      "frontmatter-image",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "profile.png"), "fake png");
        fs.writeFileSync(
          path.join(tempDir, "team.md"),
          createFrontmatter({ image: "profile.png" }, "# Team member"),
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Detects images referenced in thumbnail frontmatter field", async () => {
    await runUnusedImagesTest(
      "frontmatter-thumb",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "thumb.webp"), "fake webp");
        fs.writeFileSync(
          path.join(tempDir, "post.md"),
          createFrontmatter({ thumbnail: "/images/thumb.webp" }, "# Blog post"),
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Detects images in both frontmatter and content", async () => {
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
        expect(logOutput.includes("Found 1 unused image")).toBe(true);
        expect(logOutput.includes("unused.gif")).toBe(true);
      },
    );
  });
});
