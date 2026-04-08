import { describe, expect, test } from "bun:test";
import {
  firstWhitelistMatch,
  resolveContactFormFieldsForPage,
} from "#config/form-helpers.js";

describe("firstWhitelistMatch", () => {
  test("returns first whitelist entry whose tag is present on the page", () => {
    const whitelist = {
      products: "Product",
      categories: "Category",
    };
    expect(firstWhitelistMatch(["categories", "products"], whitelist)).toEqual({
      tag: "products",
      label: "Product",
      name: "product",
    });
  });

  test("returns null when no tag matches", () => {
    expect(firstWhitelistMatch(["news"], { products: "Product" })).toBeNull();
  });

  test("returns null for empty tags", () => {
    expect(firstWhitelistMatch([], { products: "Product" })).toBeNull();
  });
});

describe("resolveContactFormFieldsForPage", () => {
  const baseContactForm = {
    currentItemTagLabelWhitelist: {
      products: "Product",
      categories: "Category",
    },
    fields: [
      { name: "name", label: "Name", template: "form-field-input.html" },
      {
        name: "item",
        label: "Item",
        showOnCurrentItemTag: true,
        template: "form-field-textarea.html",
      },
      { name: "message", label: "Message", template: "form-field-textarea.html" },
    ],
  };

  test("hides showOnCurrentItemTag field when no whitelist match", () => {
    const out = resolveContactFormFieldsForPage(baseContactForm, []);
    expect(out.map((f) => f.name)).toEqual(["name", "message"]);
  });

  test("applies whitelist label and derived name for showOnCurrentItemTag", () => {
    const out = resolveContactFormFieldsForPage(baseContactForm, ["categories"]);
    const itemField = out.find((f) => f.name === "category");
    expect(itemField).toEqual(
      expect.objectContaining({
        name: "category",
        label: "Category",
      }),
    );
  });

  test("respects skipShowOn for showOn fields", () => {
    const form = {
      ...baseContactForm,
      fields: [
        ...baseContactForm.fields,
        {
          name: "extra",
          label: "Extra",
          showOn: "quote",
          template: "form-field-input.html",
        },
      ],
    };
    const withTag = resolveContactFormFieldsForPage(form, ["quote"], false);
    expect(withTag.some((f) => f.name === "extra")).toBe(true);

    const skipped = resolveContactFormFieldsForPage(form, ["quote"], true);
    expect(skipped.some((f) => f.name === "extra")).toBe(false);
  });
});
