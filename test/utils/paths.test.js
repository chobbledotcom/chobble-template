import { describe, expect, test } from "bun:test";
import { DATA_DIR, IMAGES_DIR, PAGES_DIR, SRC_DIR } from "#lib/paths.js";
import { fs, path, rootDir } from "#test/test-utils.js";

describe("paths", () => {
  test("All path exports are non-empty strings", () => {
    expect(typeof SRC_DIR === "string" && SRC_DIR.length > 0).toBe(true);
    expect(typeof IMAGES_DIR === "string" && IMAGES_DIR.length > 0).toBe(true);
    expect(typeof PAGES_DIR === "string" && PAGES_DIR.length > 0).toBe(true);
    expect(typeof DATA_DIR === "string" && DATA_DIR.length > 0).toBe(true);
  });

  test("All exported directories exist on the filesystem", () => {
    expect(fs.existsSync(SRC_DIR)).toBe(true);
    expect(fs.existsSync(IMAGES_DIR)).toBe(true);
    expect(fs.existsSync(PAGES_DIR)).toBe(true);
    expect(fs.existsSync(DATA_DIR)).toBe(true);
  });

  test("All exported paths are actually directories", () => {
    expect(fs.statSync(SRC_DIR).isDirectory()).toBe(true);
    expect(fs.statSync(IMAGES_DIR).isDirectory()).toBe(true);
    expect(fs.statSync(PAGES_DIR).isDirectory()).toBe(true);
    expect(fs.statSync(DATA_DIR).isDirectory()).toBe(true);
  });

  test("Paths have correct structure relative to project root", () => {
    const expectedSrc = path.join(rootDir, "src");
    const expectedImages = path.join(rootDir, "src/images");
    const expectedPages = path.join(rootDir, "src/pages");
    const expectedData = path.join(rootDir, "src/_data");

    expect(SRC_DIR).toBe(expectedSrc);
    expect(IMAGES_DIR).toBe(expectedImages);
    expect(PAGES_DIR).toBe(expectedPages);
    expect(DATA_DIR).toBe(expectedData);
  });

  test("IMAGES_DIR, PAGES_DIR, and DATA_DIR are under SRC_DIR", () => {
    expect(IMAGES_DIR.startsWith(SRC_DIR)).toBe(true);
    expect(PAGES_DIR.startsWith(SRC_DIR)).toBe(true);
    expect(DATA_DIR.startsWith(SRC_DIR)).toBe(true);
  });
});
