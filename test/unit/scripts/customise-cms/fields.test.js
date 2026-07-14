import { describe, expect, test } from "bun:test";
import {
  COMMON_FIELDS,
  createAddOnsField,
  createBodyField,
  createMarkdownField,
  createReferenceField,
  getBodyField,
} from "#scripts/customise-cms/fields.js";

describe("createMarkdownField", () => {
  test("returns code field with markdown when visual editor disabled", () => {
    const field = createMarkdownField("intro", "Intro", false);

    expect(field.type).toBe("code");
    expect(field.options).toEqual({ language: "markdown" });
  });

  test("returns rich-text field when visual editor enabled", () => {
    const field = createMarkdownField("intro", "Intro", true);

    expect(field.type).toBe("rich-text");
    expect(field.options).toBeUndefined();
  });

  test("passes through additional properties", () => {
    const field = createMarkdownField("body", "Body", false, {
      required: true,
    });

    expect(field.required).toBe(true);
    expect(field.name).toBe("body");
  });
});

describe("getBodyField", () => {
  test("returns markdown code field when visual editor disabled", () => {
    const field = getBodyField(false);

    expect(field.name).toBe("body");
    expect(field.type).toBe("code");
  });

  test("returns rich-text field when visual editor enabled", () => {
    const field = getBodyField(true);

    expect(field.name).toBe("body");
    expect(field.type).toBe("rich-text");
  });
});

describe("createBodyField", () => {
  test("applies custom label to body field", () => {
    const field = createBodyField("Biography", false);

    expect(field.name).toBe("body");
    expect(field.label).toBe("Biography");
    expect(field.type).toBe("code");
  });

  test("respects visual editor for custom-labeled body", () => {
    const field = createBodyField("Biography", true);

    expect(field.type).toBe("rich-text");
    expect(field.label).toBe("Biography");
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
});

describe("COMMON_FIELDS", () => {
  test("requires collection names", () => {
    expect(COMMON_FIELDS.name.required).toBe(true);
  });
});

describe("createAddOnsField", () => {
  test("intro uses code type when visual editor disabled", () => {
    const field = createAddOnsField(false);
    const introField = field.fields.find((f) => f.name === "intro");

    expect(introField.type).toBe("code");
  });

  test("intro uses rich-text type when visual editor enabled", () => {
    const field = createAddOnsField(true);
    const introField = field.fields.find((f) => f.name === "intro");

    expect(introField.type).toBe("rich-text");
  });

  test("options sub-field requires name and price", () => {
    const field = createAddOnsField(false);
    const optionsField = field.fields.find((f) => f.name === "options");
    const names = optionsField.fields.map((f) => f.name);

    expect(names).toContain("name");
    expect(names).toContain("price");
    expect(optionsField.fields.every((f) => f.required)).toBe(true);
  });
});
