import { describe, expect, test } from "bun:test";
import { contentTypeData } from "#utils/content-type-data.js";

describe("contentTypeData", () => {
  test("returns eleventyComputed with permalink for a known type", () => {
    const result = contentTypeData("event");
    const data = { page: { fileSlug: "my-event" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/events/my-event/");
  });

  test("sets navigationParent when type has a _name string", () => {
    const result = contentTypeData("event");
    expect(result.eleventyComputed.navigationParent()).toBe("Events");
  });

  test("omits navigationParent when type has no _name string", () => {
    const result = contentTypeData("news");
    expect(result.eleventyComputed.navigationParent).toBeUndefined();
  });

  test("permalink respects existing data.permalink", () => {
    const result = contentTypeData("property");
    const data = { permalink: "/custom/", page: { fileSlug: "ignored" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/custom/");
  });

  test("merges extra computed properties", () => {
    const extra = { myField: (data) => data.title };
    const result = contentTypeData("event", extra);
    expect(result.eleventyComputed.myField({ title: "Hello" })).toBe("Hello");
  });

  test("extra computed properties override defaults", () => {
    const customPermalink = (data) => `/custom/${data.page.fileSlug}/`;
    const result = contentTypeData("guide", { permalink: customPermalink });
    const data = { page: { fileSlug: "my-guide" } };
    expect(result.eleventyComputed.permalink(data)).toBe("/custom/my-guide/");
  });

  test("throws for unknown type without permalink_dir string", () => {
    expect(() => contentTypeData("nonexistent")).toThrow(
      /Missing strings\.nonexistent_permalink_dir/,
    );
  });

  test("builds correct permalink for each content type", () => {
    const types = [
      { type: "event", dir: "events" },
      { type: "property", dir: "properties" },
      { type: "guide", dir: "guide" },
      { type: "news", dir: "news" },
    ];
    for (const { type, dir } of types) {
      const result = contentTypeData(type);
      const data = { page: { fileSlug: "test-slug" } };
      expect(result.eleventyComputed.permalink(data)).toBe(
        `/${dir}/test-slug/`,
      );
    }
  });
});
