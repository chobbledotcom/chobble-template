import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { configureImages } from "#media/image.js";
import {
  createMockEleventyConfig,
  withChdirAsync,
  withTempDirAsync,
} from "#test/test-utils.js";

const servePlugin = { name: "serve-plugin" };
vi.mock("#media/image-lqip.js", async (importOriginal) => {
  const actual = await importOriginal();
  const stubEleventyImg = () =>
    Promise.resolve({ eleventyImageOnRequestDuringServePlugin: servePlugin });
  return { ...actual, getEleventyImg: stubEleventyImg };
});

describe("configureImages", () => {
  test("registers the shortcode, filter, plugin, and image collection", async () => {
    await withTempDirAsync("image-configure-collection", async (dir) => {
      // The collection globs src/images relative to the working directory
      mkdirSync(join(dir, "src/images"), { recursive: true });
      for (const name of ["alpha.jpg", "beta.jpg", "notes.txt"]) {
        writeFileSync(join(dir, "src/images", name), "");
      }
      await withChdirAsync(dir, async () => {
        const mockConfig = createMockEleventyConfig();

        await configureImages(mockConfig);

        expect(typeof mockConfig.asyncShortcodes.image).toBe("function");
        expect(typeof mockConfig.filters.normalizeImageUrl).toBe("function");
        expect(mockConfig.pluginCalls[0].plugin).toBe(servePlugin);
        expect(mockConfig.collections.images().toSorted()).toEqual([
          "alpha.jpg",
          "beta.jpg",
        ]);
      });
    });
  });

  test("eleventy.after copies the image cache into the site when present", async () => {
    await withTempDirAsync("image-configure", async (dir) => {
      // The handler resolves the cache directory relative to the real
      // working directory, so actually chdir into the temp dir and blank the
      // worker's IMAGE_CACHE_DIR override.
      vi.stubEnv("IMAGE_CACHE_DIR", "");
      await withChdirAsync(dir, async () => {
        const mockConfig = createMockEleventyConfig();
        await configureImages(mockConfig);
        const afterHandler = mockConfig.eventHandlers["eleventy.after"];

        // No cache dir yet: nothing to copy
        afterHandler();
        expect(existsSync(join(dir, "_site/img"))).toBe(false);

        mkdirSync(join(dir, ".image-cache"));
        writeFileSync(join(dir, ".image-cache/pic.webp"), "img-bytes");
        afterHandler();

        expect(existsSync(join(dir, "_site/img/pic.webp"))).toBe(true);
      });
      vi.unstubAllEnvs();
    });
  });

  test("eleventy.after copies the cache directory named by IMAGE_CACHE_DIR", async () => {
    await withTempDirAsync("image-configure-env", async (dir) => {
      mkdirSync(join(dir, "redirected-cache"));
      writeFileSync(join(dir, "redirected-cache/pic.webp"), "img-bytes");
      vi.stubEnv("IMAGE_CACHE_DIR", join(dir, "redirected-cache"));

      await withChdirAsync(dir, async () => {
        const mockConfig = createMockEleventyConfig();
        await configureImages(mockConfig);
        mockConfig.eventHandlers["eleventy.after"]();
      });

      expect(readFileSync(join(dir, "_site/img/pic.webp"), "utf8")).toBe(
        "img-bytes",
      );
      vi.unstubAllEnvs();
    });
  });
});
