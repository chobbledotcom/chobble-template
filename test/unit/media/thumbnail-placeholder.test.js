import { describe, expect, test } from "vitest";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";
import { fs, path, srcDir } from "#test/test-utils.js";
import { unique } from "#utils/fp/array.js";

describe("thumbnail-placeholder", () => {
  describe("getPlaceholderForPath", () => {
    test("returns svg path", () => {
      const result = getPlaceholderForPath("/products/widget/");
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("is deterministic", () => {
      const path = "/products/test-product/";
      expect(getPlaceholderForPath(path)).toBe(getPlaceholderForPath(path));
    });

    test.each([
      ["", "green"],
      ["/products/widget/", "orange"],
      ["/products/test-product/", "yellow"],
      ["/caf\u00e9/\u{1f600}/", "yellow"],
      ["/a/".repeat(100), "green"],
    ])("preserves the placeholder assignment for %j", (path, color) => {
      expect(getPlaceholderForPath(path)).toBe(
        `images/placeholders/${color}.svg`,
      );
    });

    test("distributes paths across placeholders", () => {
      const paths = Array.from({ length: 20 }, (_, i) => `/item/${i}/`);
      const placeholders = unique(paths.map(getPlaceholderForPath));
      expect(placeholders.length).toBeGreaterThan(1);
    });

    test("assigns every shipped placeholder asset", () => {
      const results = unique(
        Array.from({ length: 100 }, (_, i) =>
          getPlaceholderForPath(`/item/${i}/`),
        ),
      ).toSorted();
      const assets = fs
        .readdirSync(path.join(srcDir, "images/placeholders"))
        .filter((file) => file.endsWith(".svg"))
        .map((file) => `images/placeholders/${file}`)
        .toSorted();
      expect(results).toEqual(assets);
    });
  });
});
