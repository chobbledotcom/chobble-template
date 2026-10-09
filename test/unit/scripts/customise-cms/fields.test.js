import { describe, expect, test } from "vitest";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
  createMarkdownField,
  createReferenceField,
} from "#scripts/customise-cms/fields.js";

describe("createMarkdownField", () => {
  test("returns a field for the visual rich-text editor", () => {
    expect(createMarkdownField("intro", "Intro")).toEqual({
      name: "intro",
      type: "rich-text",
      label: "Intro",
    });
  });

  test("passes through additional properties", () => {
    const field = createMarkdownField("body", "Body", { required: true });

    expect(field.required).toBe(true);
    expect(field.name).toBe("body");
  });
});

describe("createReferenceField", () => {
  test("creates multi-reference by default", () => {
    const field = createReferenceField(
      "categories",
      "Categories",
      "categories",
    );

    expect(field.type).toBe("reference");
    expect(field.list).toBe(true);
    expect(field.options).toEqual({
      collection: "categories",
      search: "fields.name",
      value: "{path}",
      label: "{fields.name}",
    });
  });

  test("creates single reference when multiple is false", () => {
    const field = createReferenceField("author", "Author", "team", false);

    expect(field.list).toBeUndefined();
  });

  test("throws when the target collection is missing", () => {
    expect(() => createReferenceField("author", "Author", undefined)).toThrow(
      /missing options\.collection/,
    );
  });
});

describe("COMMON_FIELDS", () => {
  test("requires collection names", () => {
    expect(COMMON_FIELDS.name.required).toBe(true);
  });
});

describe("createEleventyNavigationField", () => {
  test("includes only key and order by default", () => {
    const field = createEleventyNavigationField();
    const names = field.fields.map((f) => f.name);

    expect(field.name).toBe("eleventyNavigation");
    expect(names).toEqual(["key", "order"]);
  });

  test("adds a url field when includeUrl is set", () => {
    const field = createEleventyNavigationField(true);
    const names = field.fields.map((f) => f.name);

    expect(names).toEqual(["key", "order", "url"]);
  });
});
