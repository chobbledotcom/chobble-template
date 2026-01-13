import { describe, expect, test } from "bun:test";
import {
  configureThumbnailPlaceholder,
  getPlaceholderForPath,
  hashString,
  PLACEHOLDER_COLORS,
} from "#media/thumbnail-placeholder.js";
import { createMockEleventyConfig } from "#test/test-utils.js";
import { unique } from "#utils/array-utils.js";

describe("thumbnail-placeholder", () => {
  describe("PLACEHOLDER_COLORS", () => {
    test("contains expected colors", () => {
      expect(PLACEHOLDER_COLORS).toContain("green");
      expect(PLACEHOLDER_COLORS).toContain("blue");
      expect(PLACEHOLDER_COLORS).toContain("pink");
      expect(PLACEHOLDER_COLORS).toContain("yellow");
      expect(PLACEHOLDER_COLORS).toContain("purple");
      expect(PLACEHOLDER_COLORS).toContain("orange");
    });

    test("has six colors", () => {
      expect(PLACEHOLDER_COLORS.length).toBe(6);
    });
  });

  describe("hashString", () => {
    test("returns a positive number for any string", () => {
      expect(hashString("test")).toBeGreaterThanOrEqual(0);
      expect(hashString("/products/widget/")).toBeGreaterThanOrEqual(0);
      expect(hashString("")).toBeGreaterThanOrEqual(0);
    });

    test("returns consistent hash for the same input", () => {
      const path = "/products/my-product/";
      expect(hashString(path)).toBe(hashString(path));
    });

    test("returns different hashes for different inputs", () => {
      expect(hashString("/a/")).not.toBe(hashString("/b/"));
    });
  });

  describe("getPlaceholderForPath", () => {
    test("returns a valid placeholder path", () => {
      const result = getPlaceholderForPath("/products/widget/");
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("returns consistent placeholder for the same path", () => {
      const path = "/products/test-product/";
      const first = getPlaceholderForPath(path);
      const second = getPlaceholderForPath(path);
      expect(first).toBe(second);
    });

    test("handles empty path", () => {
      const result = getPlaceholderForPath("");
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("handles null/undefined path", () => {
      const result = getPlaceholderForPath(null);
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("different paths can get different placeholders", () => {
      const paths = [
        "/products/a/",
        "/products/b/",
        "/products/c/",
        "/products/d/",
        "/products/e/",
        "/products/f/",
        "/products/g/",
        "/products/h/",
      ];

      const placeholders = unique(paths.map(getPlaceholderForPath));

      // With 8 paths and 6 colors, we should get at least 2 different placeholders
      expect(placeholders.length).toBeGreaterThanOrEqual(2);
    });

    test("placeholder uses one of the defined colors", () => {
      const result = getPlaceholderForPath("/any/path/");
      const colorPattern = new RegExp(
        `^images/placeholders/(${PLACEHOLDER_COLORS.join("|")})\\.svg$`,
      );
      expect(result).toMatch(colorPattern);
    });
  });

  describe("configureThumbnailPlaceholder", () => {
    test("registers thumbnailPlaceholder filter", () => {
      const config = createMockEleventyConfig();
      configureThumbnailPlaceholder(config);

      expect(config.filters.thumbnailPlaceholder).toBeDefined();
    });

    test("registered filter returns placeholder path", () => {
      const config = createMockEleventyConfig();
      configureThumbnailPlaceholder(config);

      const result = config.filters.thumbnailPlaceholder("/test/path/");
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });
  });
});
