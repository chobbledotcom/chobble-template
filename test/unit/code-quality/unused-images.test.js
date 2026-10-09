import { describe, expect, test } from "vitest";
import { configureUnusedImages } from "#media/unused-images.js";
import {
  captureConsoleLogAsync,
  cleanupTempDir,
  createFrontmatter,
  createMockEleventyConfig,
  createTempDir,
  fs,
  path,
} from "#test/test-utils.js";

/** Assert all images are used */
const expectAllImagesUsed = (logs) =>
  expect(
    logs.some((log) =>
      log.includes("All images in /src/images/ are being used"),
    ),
  ).toBe(true);

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

/** Write a JSON data file under the temp dir's _data directory */
const writeDataFile = (tempDir, filename, data) => {
  fs.mkdirSync(path.join(tempDir, "_data"), { recursive: true });
  fs.writeFileSync(path.join(tempDir, "_data", filename), JSON.stringify(data));
};

/** Assert the unused-images report lists exactly these images */
const expectUnusedImages = (logs, names) => {
  const logOutput = logs.join("\n");
  expect(logOutput.includes("Unused Images Report")).toBe(true);
  for (const name of names) {
    expect(logOutput.includes(name)).toBe(true);
  }
  expect(
    logOutput.includes(
      `Found ${names.length} unused image${names.length === 1 ? "" : "s"}`,
    ),
  ).toBe(true);
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

  const expectNoImagesFound = (logs) =>
    expect(
      logs.some((log) => log.includes("No images found in /src/images/")),
    ).toBe(true);

  test("Handles empty images directory", async () => {
    await runUnusedImagesTest("empty", null, expectNoImagesFound);
  });

  test("Ignores non-image files in images directory", async () => {
    await runUnusedImagesTest(
      "non-image",
      (_tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "readme.txt"), "text file");
        fs.writeFileSync(path.join(imagesDir, "data.json"), "{}");
      },
      expectNoImagesFound,
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
      (logs) => expectUnusedImages(logs, ["unused.png", "also-unused.gif"]),
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
        fs.writeFileSync(path.join(imagesDir, "thumb.jpg"), "fake jpg");
        fs.writeFileSync(path.join(imagesDir, "inline.png"), "fake png");
        fs.writeFileSync(path.join(imagesDir, "unused.gif"), "fake gif");
        fs.writeFileSync(
          path.join(tempDir, "page.md"),
          createFrontmatter(
            { thumbnail: "thumb.jpg" },
            "![Inline](/images/inline.png)",
          ),
        );
      },
      (logs) => expectUnusedImages(logs, ["unused.gif"]),
    );
  });

  test("Detects images referenced inside nested block frontmatter", async () => {
    await runUnusedImagesTest(
      "block-frontmatter",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "hero-shot.jpg"), "fake jpg");
        fs.writeFileSync(
          path.join(tempDir, "page.md"),
          createFrontmatter({
            blocks: [{ type: "hero", image: "/images/hero-shot.jpg" }],
          }),
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Detects images in quoted HTML inside block content", async () => {
    await runUnusedImagesTest(
      "block-html",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "emblem.svg"), "fake svg");
        fs.writeFileSync(
          path.join(tempDir, "page.md"),
          [
            "---",
            "blocks:",
            "  - type: hero",
            "    content: |",
            '      <img src="/images/emblem.svg" alt="">',
            "---",
            "",
          ].join("\n"),
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Detects the site logo declared in site data", async () => {
    await runUnusedImagesTest(
      "site-logo",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "mark.svg"), "fake svg");
        writeDataFile(tempDir, "site.json", {
          name: "Test site",
          logo: "/images/mark.svg",
        });
      },
      expectAllImagesUsed,
    );
  });

  test("Detects images referenced from include templates", async () => {
    await runUnusedImagesTest(
      "include-ref",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "org-logo.png"), "fake png");
        fs.mkdirSync(path.join(tempDir, "_includes"), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, "_includes", "footer.html"),
          '<img src="/images/org-logo.png" alt="Org">',
        );
      },
      expectAllImagesUsed,
    );
  });

  test("Does not count images only named in other data files", async () => {
    await runUnusedImagesTest(
      "data-not-usage",
      (tempDir, imagesDir) => {
        fs.writeFileSync(path.join(imagesDir, "listed.png"), "fake png");
        writeDataFile(tempDir, "alt-tags.json", {
          images: [{ image: "listed.png", alt: "Listed" }],
        });
      },
      (logs) => expectUnusedImages(logs, ["listed.png"]),
    );
  });
});
