import { describe, expect, test } from "bun:test";
import { linkableContent } from "#utils/linkable-content.js";

describe("linkableContent", () => {
  test("returns eleventyComputed with permalink for a known type", () => {
    const result = linkableContent("event");
    const data = { page: { fileSlug: "my-event" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/events/my-event/");
  });

  test("sets navigationParent from strings", () => {
    const result = linkableContent("event");
    expect(result.eleventyComputed.navigationParent()).toBe("Events");
  });

  test("permalink respects existing data.permalink", () => {
    const result = linkableContent("property");
    const data = { permalink: "/custom/", page: { fileSlug: "ignored" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/custom/");
  });

  test("permalink normalises bare slug from frontmatter", () => {
    const result = linkableContent("property");
    const data = { permalink: "my-custom-page", page: { fileSlug: "ignored" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/my-custom-page/");
  });

  test("merges extra computed properties", () => {
    const extra = { myField: (data) => data.title };
    const result = linkableContent("event", extra);
    expect(result.eleventyComputed.myField({ title: "Hello" })).toBe("Hello");
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
      { type: "event", dir: "events" },
      { type: "property", dir: "properties" },
      { type: "guide", dir: "guide" },
      { type: "news", dir: "news" },
      { type: "menus", dir: "menus" },
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
