import { describe, expect, test } from "bun:test";
import {
  configureThumbnailPlaceholder,
  getPlaceholderForPath,
  hashString,
  PLACEHOLDER_COLORS,
} from "#media/thumbnail-placeholder.js";
import { createMockEleventyConfig } from "#test/test-utils.js";
import { unique } from "#toolkit/fp/array.js";

describe("thumbnail-placeholder", () => {
  describe("hashString", () => {
    test("returns positive number", () => {
      expect(hashString("test")).toBeGreaterThanOrEqual(0);
      expect(hashString("")).toBeGreaterThanOrEqual(0);
    });

    test("is deterministic", () => {
      const path = "/products/my-product/";
      expect(hashString(path)).toBe(hashString(path));
    });

    test("varies with input", () => {
      expect(hashString("/a/")).not.toBe(hashString("/b/"));
    });
  });

  describe("getPlaceholderForPath", () => {
    test("returns svg path", () => {
      const result = getPlaceholderForPath("/products/widget/");
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("is deterministic", () => {
      const path = "/products/test-product/";
      expect(getPlaceholderForPath(path)).toBe(getPlaceholderForPath(path));
    });

    test("handles empty input", () => {
      expect(getPlaceholderForPath("")).toMatch(/\.svg$/);
    });

    test("distributes paths across placeholders", () => {
      const paths = Array.from({ length: 20 }, (_, i) => `/item/${i}/`);
      const placeholders = unique(paths.map(getPlaceholderForPath));
      expect(placeholders.length).toBeGreaterThan(1);
    });

    test("uses defined colors", () => {
      const result = getPlaceholderForPath("/any/path/");
      const colorPattern = new RegExp(
        `^images/placeholders/(${PLACEHOLDER_COLORS.join("|")})\\.svg$`,
      );
      expect(result).toMatch(colorPattern);
    });
  });

  describe("configureThumbnailPlaceholder", () => {
    test("registers filter", () => {
      const config = createMockEleventyConfig();
      configureThumbnailPlaceholder(config);
      expect(config.filters.thumbnailPlaceholder).toBeDefined();
      expect(config.filters.thumbnailPlaceholder("/test/")).toMatch(/\.svg$/);
    });
  });
});
