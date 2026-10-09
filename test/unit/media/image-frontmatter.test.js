import { describe, expect, test } from "vitest";
import { getFirstValidImage } from "#media/image-frontmatter.js";
import { createTempFile, fs, path, withTempDir } from "#test/test-utils.js";

/**
 * Creates a temp directory with src/images structure and optional test files.
 * Returns srcDir to pass as baseDir to getFirstValidImage.
 */
const withImageTestDir = (name, filenames, callback) =>
  withTempDir(name, (tempDir) => {
    const srcDir = path.join(tempDir, "src");
    const imagesDir = path.join(srcDir, "images");
    fs.mkdirSync(imagesDir, { recursive: true });
    for (const filename of filenames) {
      createTempFile(imagesDir, filename, "test content");
    }
    callback(srcDir);
  });

describe("image-frontmatter", () => {
  test.each([
    null,
    undefined,
    "",
    "   ",
  ])("ignores empty candidate %j", (candidate) => {
    expect(getFirstValidImage([candidate])).toBeUndefined();
    expect(
      getFirstValidImage([candidate, "https://example.com/image.jpg"]),
    ).toBe("https://example.com/image.jpg");
  });

  test.each([
    "http://example.com/image.jpg",
    "https://example.com/image.jpg",
  ])("accepts external image %s", (url) => {
    expect(getFirstValidImage([url])).toBe(url);
  });

  test.each([
    "/images/photo.jpg",
    "images/photo.jpg",
    "src/images/photo.jpg",
    "/src/images/photo.jpg",
  ])("returns the original path for existing image %s", (imagePath) => {
    withImageTestDir("image-prefix", ["photo.jpg"], (srcDir) => {
      expect(getFirstValidImage([imagePath], srcDir)).toBe(imagePath);
    });
  });

  test("throws for a missing local candidate rather than falling back", () => {
    withImageTestDir("image-missing", [], (srcDir) => {
      expect(() =>
        getFirstValidImage(
          ["/images/missing.jpg", "https://example.com/fallback.jpg"],
          srcDir,
        ),
      ).toThrow(
        `Image file not found: ${path.join(srcDir, "images/missing.jpg")}`,
      );
    });
  });

  test("does not validate candidates after the first valid image", () => {
    withImageTestDir("image-short-circuit", [], (srcDir) => {
      expect(
        getFirstValidImage(
          ["https://example.com/first.jpg", "/images/missing.jpg"],
          srcDir,
        ),
      ).toBe("https://example.com/first.jpg");
    });
  });

  test("reuses existence checks across calls and equivalent path prefixes", () => {
    withImageTestDir("image-cache", ["photo.jpg"], (srcDir) => {
      expect(getFirstValidImage(["/images/photo.jpg"], srcDir)).toBe(
        "/images/photo.jpg",
      );
      fs.unlinkSync(path.join(srcDir, "images/photo.jpg"));
      expect(getFirstValidImage(["src/images/photo.jpg"], srcDir)).toBe(
        "src/images/photo.jpg",
      );
    });
  });

  test("does not share existence results between base directories", () => {
    withImageTestDir("image-base-existing", ["photo.jpg"], (srcDir) => {
      expect(getFirstValidImage(["/images/photo.jpg"], srcDir)).toBe(
        "/images/photo.jpg",
      );
      withImageTestDir("image-base-missing", [], (otherDir) => {
        expect(() =>
          getFirstValidImage(["/images/photo.jpg"], otherDir),
        ).toThrow(
          `Image file not found: ${path.join(otherDir, "images/photo.jpg")}`,
        );
      });
    });
  });

  describe("getFirstValidImage", () => {
    test("returns undefined for empty array", () => {
      expect(getFirstValidImage([])).toBeUndefined();
    });

    test("returns undefined for array of falsy values", () => {
      expect(getFirstValidImage([null, undefined, ""])).toBeUndefined();
    });

    test("returns first external URL from candidates", () => {
      const candidates = [
        null,
        "",
        "https://example.com/image.jpg",
        "https://example.com/other.jpg",
      ];
      expect(getFirstValidImage(candidates)).toBe(
        "https://example.com/image.jpg",
      );
    });

    test("skips invalid candidates and returns first valid one", () => {
      const candidates = [null, undefined, "", "http://example.com/valid.jpg"];
      expect(getFirstValidImage(candidates)).toBe(
        "http://example.com/valid.jpg",
      );
    });

    test("returns first existing local file", () => {
      withImageTestDir(
        "getFirstValidImage-local",
        ["first.jpg", "second.jpg"],
        (srcDir) => {
          const candidates = [null, "/images/first.jpg", "/images/second.jpg"];
          expect(getFirstValidImage(candidates, srcDir)).toBe(
            "/images/first.jpg",
          );
        },
      );
    });

    test("returns external URL when no local files provided", () => {
      withImageTestDir("getFirstValidImage-fallback", [], (srcDir) => {
        const candidates = ["https://example.com/fallback.jpg"];
        expect(getFirstValidImage(candidates, srcDir)).toBe(
          "https://example.com/fallback.jpg",
        );
      });
    });
  });
});
