import { describe, expect, test } from "bun:test";
import { resolveFormFields } from "#config/form-helpers.js";

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

const extraField = (overrides) => ({
  name: "extra",
  label: "Extra",
  template: "form-field-input.html",
  ...overrides,
});

describe("resolveFormFields", () => {
  test("omits showForItemTag field when no whitelist tag matches page tags", () => {
    const out = resolveFormFields(baseContactForm, []);
    expect(out.map((f) => f.name)).toEqual(["name", "message"]);
  });

  test("rewrites showForItemTag field name and label from matching whitelist entry", () => {
    const out = resolveFormFields(baseContactForm, ["categories"]);
    const rewritten = out.find(
      (f) =>
        f.template === "form-field-textarea.html" && f.label === "Category",
    );
    expect(rewritten).toEqual({
      name: "category",
      label: "Category",
      template: "form-field-textarea.html",
    });
  });

  test("derives field name by lowercasing and replacing whitespace with underscores", () => {
    const form = {
      ...baseContactForm,
      itemTagLabels: { services: "Service Type" },
    };
    const out = resolveFormFields(form, ["services"]);
    const rewritten = out.find((f) => f.label === "Service Type");
    expect(rewritten.name).toBe("service_type");
  });

  test("picks the first itemTagLabels entry when multiple page tags match", () => {
    // itemTagLabels key order wins, not page-tag order
    const out = resolveFormFields(baseContactForm, ["categories", "products"]);
    const rewritten = out.filter(
      (f) => f.name === "product" || f.name === "category",
    );
    expect(rewritten).toHaveLength(1);
    expect(rewritten[0].name).toBe("product");
  });

  test("includes showOn field when the tag is present and skipShowOn is false", () => {
    const form = {
      ...baseContactForm,
      fields: [extraField({ showOn: "quote" })],
    };
    const out = resolveFormFields(form, ["quote"], false);
    expect(out.map((f) => f.name)).toContain("extra");
  });

  test("drops showOn field when skipShowOn is true even if tag matches", () => {
    const form = {
      ...baseContactForm,
      fields: [extraField({ showOn: "quote" })],
    };
    const out = resolveFormFields(form, ["quote"], true);
    expect(out.map((f) => f.name)).not.toContain("extra");
  });

  test("drops showOn field when its tag is not in page tags", () => {
    const form = {
      ...baseContactForm,
      fields: [extraField({ showOn: "quote" })],
    };
    const out = resolveFormFields(form, ["products"], false);
    expect(out.map((f) => f.name)).not.toContain("extra");
  });

  test("treats missing tags input as an empty tag list", () => {
    const out = resolveFormFields(baseContactForm, undefined);
    // showForItemTag field is dropped (no match), plain fields pass through
    expect(out.map((f) => f.name)).toEqual(["name", "message"]);
  });
});
