import { describe, expect, test } from "bun:test";
import {
  createAddOnsField,
  createBodyField,
  createMarkdownField,
  createReferenceField,
  createTabsField,
  getBodyField,
} from "#scripts/customise-cms/fields.js";

describe("customise-cms fields", () => {
  describe("createMarkdownField", () => {
    test("returns code field with markdown language when visual editor disabled", () => {
      const field = createMarkdownField("intro", "Intro", false);
      expect(field).toEqual({
        name: "intro",
        label: "Intro",
        type: "code",
        options: { language: "markdown" },
      });
    });

    test("returns rich-text field when visual editor enabled", () => {
      const field = createMarkdownField("intro", "Intro", true);
      expect(field).toEqual({
        name: "intro",
        label: "Intro",
        type: "rich-text",
      });
    });

    test("passes through additional properties", () => {
      const field = createMarkdownField("body", "Body", false, {
        required: true,
      });
      expect(field.required).toBe(true);
      expect(field.type).toBe("code");
    });
  });

  describe("getBodyField", () => {
    test("returns markdown code field when visual editor disabled", () => {
      const field = getBodyField(false);
      expect(field.name).toBe("body");
      expect(field.type).toBe("code");
      expect(field.options).toEqual({ language: "markdown" });
    });

    test("returns rich-text field when visual editor enabled", () => {
      const field = getBodyField(true);
      expect(field.name).toBe("body");
      expect(field.type).toBe("rich-text");
      expect(field.options).toBeUndefined();
    });
  });

  describe("createBodyField", () => {
    test("creates body field with custom label", () => {
      const field = createBodyField("Biography", false);
      expect(field.name).toBe("body");
      expect(field.label).toBe("Biography");
      expect(field.type).toBe("code");
    });

    test("respects visual editor setting", () => {
      const field = createBodyField("Biography", true);
      expect(field.type).toBe("rich-text");
    });
  });

  describe("createTabsField", () => {
    test("creates tabs with markdown body when visual editor disabled", () => {
      const field = createTabsField(false);
      const bodyField = field.fields.find((f) => f.name === "body");
      expect(bodyField.type).toBe("code");
      expect(bodyField.options).toEqual({ language: "markdown" });
    });

    test("creates tabs with rich-text body when visual editor enabled", () => {
      const field = createTabsField(true);
      const bodyField = field.fields.find((f) => f.name === "body");
      expect(bodyField.type).toBe("rich-text");
      expect(bodyField.options).toBeUndefined();
    });

    test("includes title and image fields alongside body", () => {
      const field = createTabsField(false);
      const fieldNames = field.fields.map((f) => f.name);
      expect(fieldNames).toEqual(["title", "image", "body"]);
    });
  });

  describe("createAddOnsField", () => {
    test("intro uses code type when visual editor disabled", () => {
      const field = createAddOnsField(false);
      const introField = field.fields.find((f) => f.name === "intro");
      expect(introField.type).toBe("code");
      expect(introField.options).toEqual({ language: "markdown" });
    });

    test("intro uses rich-text type when visual editor enabled", () => {
      const field = createAddOnsField(true);
      const introField = field.fields.find((f) => f.name === "intro");
      expect(introField.type).toBe("rich-text");
      expect(introField.options).toBeUndefined();
    });

    test("options has correct nested structure with required fields", () => {
      const field = createAddOnsField(false);
      const optionsField = field.fields.find((f) => f.name === "options");
      expect(optionsField.type).toBe("object");
      expect(optionsField.list).toBe(true);

      const nameField = optionsField.fields.find((f) => f.name === "name");
      const priceField = optionsField.fields.find((f) => f.name === "price");
      expect(nameField.required).toBe(true);
      expect(priceField.required).toBe(true);
    });
  });

  describe("createReferenceField", () => {
    test("creates valid multi-reference configuration", () => {
      const field = createReferenceField(
        "categories",
        "Categories",
        "categories",
      );

      expect(field.type).toBe("reference");
      expect(field.list).toBe(true);
      expect(field.options.collection).toBe("categories");
      expect(field.options.value).toBe("{path}");
    });

    test("omits list property for single reference", () => {
      const field = createReferenceField("author", "Author", "team", false);
      expect(field.list).toBeUndefined();
    });
  });
});
