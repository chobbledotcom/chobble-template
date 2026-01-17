import { describe, expect, test } from "bun:test";
import { getFirstValidImage, isValidImage } from "#media/image-frontmatter.js";
import {
  createTempFile,
  fs,
  path,
  withMockedCwd,
  withTempDir,
} from "#test/test-utils.js";

/**
 * Creates a temp directory with src/images structure and optional test files.
 * Returns a function to run assertions with mocked cwd.
 */
const withImageTestDir = (name, filenames, callback) =>
  withTempDir(name, (tempDir) => {
    const imagesDir = path.join(tempDir, "src", "images");
    fs.mkdirSync(imagesDir, { recursive: true });
    for (const filename of filenames) {
      createTempFile(imagesDir, filename, "test content");
    }
    withMockedCwd(tempDir, () => callback(imagesDir));
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
      withImageTestDir("isValidImage-existing", ["test.jpg"], () => {
        expect(isValidImage("/images/test.jpg")).toBe(true);
      });
    });

    test("returns true for existing file with src/ prefix", () => {
      withImageTestDir("isValidImage-src-prefix", ["photo.jpg"], () => {
        expect(isValidImage("src/images/photo.jpg")).toBe(true);
      });
    });

    test("throws error for non-existent local file", () => {
      withImageTestDir("isValidImage-nonexistent", [], () => {
        expect(() => isValidImage("/images/missing.jpg")).toThrow(
          /Image file not found/,
        );
      });
    });

    test("strips leading slash from path", () => {
      withImageTestDir("isValidImage-leading-slash", ["slash-test.jpg"], () => {
        expect(isValidImage("/images/slash-test.jpg")).toBe(true);
        expect(isValidImage("images/slash-test.jpg")).toBe(true);
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
        () => {
          const candidates = [null, "/images/first.jpg", "/images/second.jpg"];
          expect(getFirstValidImage(candidates)).toBe("/images/first.jpg");
        },
      );
    });

    test("returns external URL when no local files provided", () => {
      withImageTestDir("getFirstValidImage-fallback", [], () => {
        const candidates = ["https://example.com/fallback.jpg"];
        expect(getFirstValidImage(candidates)).toBe(
          "https://example.com/fallback.jpg",
        );
      });
    });
  });
});
