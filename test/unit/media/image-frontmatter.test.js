import { describe, expect, test } from "bun:test";
import { getFirstValidImage, isValidImage } from "#media/image-frontmatter.js";
import { createTempFile, fs, path, withTempDir } from "#test/test-utils.js";

/**
 * Creates a temp directory with src/images structure and optional test files.
 * Returns srcDir to pass as baseDir to isValidImage/getFirstValidImage.
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
  describe("isValidImage", () => {
    test("returns false for null", () => {
      expect(isValidImage(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isValidImage(undefined)).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(isValidImage("")).toBe(false);
    });

    test("returns false for whitespace-only string", () => {
      expect(isValidImage("   ")).toBe(false);
    });

    test("returns true for http URL", () => {
      expect(isValidImage("http://example.com/image.jpg")).toBe(true);
    });

    test("returns true for https URL", () => {
      expect(isValidImage("https://example.com/image.jpg")).toBe(true);
    });

    test("returns true for existing local file", () => {
      withImageTestDir("isValidImage-existing", ["test.jpg"], (srcDir) => {
        expect(isValidImage("/images/test.jpg", srcDir)).toBe(true);
      });
    });

    test("returns true for existing file with src/ prefix", () => {
      withImageTestDir("isValidImage-src-prefix", ["photo.jpg"], (srcDir) => {
        expect(isValidImage("src/images/photo.jpg", srcDir)).toBe(true);
      });
    });

    test("throws error for non-existent local file", () => {
      withImageTestDir("isValidImage-nonexistent", [], (srcDir) => {
        expect(() => isValidImage("/images/missing.jpg", srcDir)).toThrow(
          /Image file not found/,
        );
      });
    });

    test("strips leading slash from path", () => {
      withImageTestDir(
        "isValidImage-leading-slash",
        ["slash-test.jpg"],
        (srcDir) => {
          expect(isValidImage("/images/slash-test.jpg", srcDir)).toBe(true);
          expect(isValidImage("images/slash-test.jpg", srcDir)).toBe(true);
        },
      );
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
