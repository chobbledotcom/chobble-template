import { describe, expect, test } from "vitest";
import { linkableContent } from "#utils/linkable-content.js";

describe("linkableContent", () => {
  test("returns eleventyComputed with permalink for a known type", () => {
    const result = linkableContent("news");
    const data = { page: { fileSlug: "my-post" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/news/my-post/");
  });

  test("sets navigationParent from strings", () => {
    const result = linkableContent("news");
    expect(result.eleventyComputed.navigationParent()).toBe("News");
  });

  test("permalink respects existing data.permalink", () => {
    const result = linkableContent("guide");
    const data = { permalink: "/custom/", page: { fileSlug: "ignored" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/custom/");
  });

  test("permalink normalises bare slug from frontmatter", () => {
    const result = linkableContent("guide");
    const data = { permalink: "my-custom-page", page: { fileSlug: "ignored" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/my-custom-page/");
  });

  test("merges extra computed properties", () => {
    const extra = { myField: (data) => data.name };
    const result = linkableContent("news", extra);
    expect(result.eleventyComputed.myField({ name: "Hello" })).toBe("Hello");
  });

  test("extra computed properties override defaults", () => {
    const customPermalink = (data) => `/custom/${data.page.fileSlug}/`;
    const result = linkableContent("guide", { permalink: customPermalink });
    const data = { page: { fileSlug: "my-guide" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/custom/my-guide/");
  });

  test("throws for unknown type without permalink_dir string", () => {
    expect(() => linkableContent("nonexistent")).toThrow(
      /Missing strings\.nonexistent_permalink_dir/,
    );
  });

  test("builds correct permalink for each content type", () => {
    const types = [
      { type: "guide", dir: "guide" },
      { type: "news", dir: "news" },
    ];
    for (const { type, dir } of types) {
      const result = linkableContent(type);
      const data = { page: { fileSlug: "test-slug" } };
      expect(result.eleventyComputed.permalink(data)).toBe(
        `/${dir}/test-slug/`,
      );
    }
  });
});
