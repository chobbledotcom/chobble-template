import { describe, expect, test } from "bun:test";
import { resolveFormFields } from "#config/form-helpers.js";

describe("resolveFormFields", () => {
  const baseContactForm = {
    itemTagLabels: {
      products: "Product",
      categories: "Category",
    },
    fields: [
      { name: "name", label: "Name", template: "form-field-input.html" },
      {
        name: "item",
        label: "Item",
        showForItemTag: true,
        template: "form-field-textarea.html",
      },
      {
        name: "message",
        label: "Message",
        template: "form-field-textarea.html",
      },
    ],
  };

  test("hides showForItemTag field when no whitelist match", () => {
    const out = resolveFormFields(baseContactForm, []);
    expect(out.map((f) => f.name)).toEqual(["name", "message"]);
  });

  test("applies whitelist label and derived name for showForItemTag", () => {
    const out = resolveFormFields(baseContactForm, ["categories"]);
    const itemField = out.find((f) => f.name === "category");
    expect(itemField).toEqual(
      expect.objectContaining({
        name: "category",
        label: "Category",
      }),
    );
  });

  test("uses first whitelist entry when multiple tags match", () => {
    const out = resolveFormFields(baseContactForm, ["categories", "products"]);
    const itemField = out.find((f) => f.showForItemTag === undefined);
    // whitelist order: products first, so products label wins
    const tagged = out.filter(
      (f) => f.name === "product" || f.name === "category",
    );
    expect(tagged.length).toBe(1);
    expect(tagged[0].name).toBe("product");
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
    const withTag = resolveFormFields(form, ["quote"], false);
    expect(withTag.some((f) => f.name === "extra")).toBe(true);

    const skipped = resolveFormFields(form, ["quote"], true);
    expect(skipped.some((f) => f.name === "extra")).toBe(false);
  });
});
