import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { materializeImageCache } from "#media/image-cache-output.js";
import { withTempDirAsync } from "#test/test-utils.js";

const originalGithubActions = process.env.GITHUB_ACTIONS;

afterEach(() => {
  if (originalGithubActions === undefined) {
    delete process.env.GITHUB_ACTIONS;
  } else {
    process.env.GITHUB_ACTIONS = originalGithubActions;
  }
});

const withCache = (name, testFn) =>
  withTempDirAsync(name, async (tempDir) => {
    const source = path.join(tempDir, "cache");
    const destination = path.join(tempDir, "output");
    const nested = path.join(source, "nested");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(source, "one.webp"), "one");
    fs.writeFileSync(path.join(nested, "two.jpg"), "two");
    await testFn({ destination, source });
  });

const inode = (filePath) => fs.statSync(filePath).ino;

describe("image cache output", () => {
  test("copies files outside GitHub Actions", () =>
    withCache("image-cache-copy", ({ destination, source }) => {
      delete process.env.GITHUB_ACTIONS;

      const result = materializeImageCache({ destination, source });

      expect(result).toMatchObject({ copied: 2, linked: 0, total: 2 });
      expect(inode(path.join(destination, "one.webp"))).not.toBe(
        inode(path.join(source, "one.webp")),
      );
      expect(
        fs.readFileSync(path.join(destination, "nested/two.jpg"), "utf8"),
      ).toBe("two");
    }));

  test("hard links files in GitHub Actions", () =>
    withCache("image-cache-link", ({ destination, source }) => {
      process.env.GITHUB_ACTIONS = "true";

      const result = materializeImageCache({ destination, source });

      expect(result).toMatchObject({ copied: 0, linked: 2, total: 2 });
      expect(inode(path.join(destination, "nested/two.jpg"))).toBe(
        inode(path.join(source, "nested/two.jpg")),
      );
    }));

  test("falls back to copying when a hard link fails", () =>
    withCache("image-cache-fallback", ({ destination, source }) => {
      const result = materializeImageCache({
        destination,
        linkTree: () => false,
        source,
        useHardLinks: true,
      });

      expect(result).toMatchObject({ copied: 2, linked: 0, total: 2 });
      const sourceStat = fs.statSync(path.join(source, "one.webp"));
      const copiedStat = fs.statSync(path.join(destination, "one.webp"));
      expect(copiedStat.ino).not.toBe(sourceStat.ino);
    }));
});
