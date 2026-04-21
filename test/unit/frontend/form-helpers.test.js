import { describe, expect, test } from "bun:test";
import {
  addFieldTemplates,
  getFieldTemplate,
  processContactForm,
} from "#config/form-helpers.js";
import { expectObjectProps, expectProp } from "#test/test-utils.js";

describe("form-helpers", () => {
  describe("getFieldTemplate", () => {
    test.each([
      { type: "textarea", expected: "form-field-textarea.html" },
      { type: "select", expected: "form-field-select.html" },
      { type: "radio", expected: "form-field-radio.html" },
      { type: "heading", expected: "form-field-heading.html" },
      { type: "text", expected: "form-field-input.html" },
      { type: "email", expected: "form-field-input.html" },
      { type: "date", expected: "form-field-input.html" },
      { type: "tel", expected: "form-field-input.html" },
      { type: "unknown", expected: "form-field-input.html" },
    ])("returns $expected for type=$type", ({ type, expected }) => {
      expect(getFieldTemplate({ type })).toBe(expected);
    });

    test("falls back to the input template when type is missing", () => {
      expect(getFieldTemplate({})).toBe("form-field-input.html");
    });
  });

  describe("addFieldTemplates", () => {
    test("attaches the resolved template to each field", () => {
      const fields = [
        { name: "name", type: "text" },
        { name: "message", type: "textarea" },
        { name: "country", type: "select" },
      ];
      const result = addFieldTemplates(fields);
      expectProp("template")(result, [
        "form-field-input.html",
        "form-field-textarea.html",
        "form-field-select.html",
      ]);
    });

    test("preserves all original field properties", () => {
      const fields = [
        { name: "message", type: "textarea", label: "Message", required: true },
      ];
      const [result] = addFieldTemplates(fields);
      expectObjectProps({
        name: "message",
        type: "textarea",
        label: "Message",
        required: true,
        template: "form-field-textarea.html",
      })(result);
    });

    test("does not mutate the input fields", () => {
      const original = [{ name: "test", type: "text" }];
      const snapshot = structuredClone(original);
      addFieldTemplates(original);
      expect(original).toEqual(snapshot);
    });
  });

  describe("processContactForm", () => {
    test("replaces fields with template-annotated fields", () => {
      const result = processContactForm({
        submitButtonText: "Send",
        fields: [
          { name: "name", type: "text" },
          { name: "email", type: "email" },
        ],
      });
      expectProp("template")(result.fields, [
        "form-field-input.html",
        "form-field-input.html",
      ]);
    });

    test("preserves top-level properties other than fields", () => {
      const result = processContactForm({
        submitButtonText: "Send Message",
        successMessage: "Thanks!",
        fields: [{ name: "test", type: "text" }],
      });
      expectObjectProps({
        submitButtonText: "Send Message",
        successMessage: "Thanks!",
      })(result);
    });

    test("does not mutate the input data", () => {
      const original = {
        fields: [{ name: "test", type: "text" }],
      };
      const snapshot = structuredClone(original);
      processContactForm(original);
      expect(original).toEqual(snapshot);
    });
  });

  describe("contact-form.js data file integration", () => {
    test("default export returns fields that all have template paths", async () => {
      const { default: getContactForm } = await import("#data/contact-form.js");
      const contactForm = getContactForm();
      expect(Array.isArray(contactForm.fields)).toBe(true);
      for (const field of contactForm.fields) {
        expect(field.template).toMatch(/^form-field-.*\.html$/);
      }
    });
  });
});
