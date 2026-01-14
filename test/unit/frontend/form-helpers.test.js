import { describe, expect, test } from "bun:test";
import { addFieldTemplates, processContactForm } from "#config/form-helpers.js";
import { expectObjectProps, expectProp } from "#test/test-utils.js";

describe("form-helpers", () => {
  describe("addFieldTemplates", () => {
    test("adds template property to each field", () => {
      const fields = [
        { name: "name", type: "text" },
        { name: "email", type: "email" },
      ];
      const result = addFieldTemplates(fields);
      expectProp("template")(result, [
        "form-field-input.html",
        "form-field-input.html",
      ]);
    });

    test("preserves all original field properties", () => {
      const fields = [
        { name: "message", type: "textarea", label: "Message", required: true },
      ];
      const result = addFieldTemplates(fields);
      expect(result[0].name).toBe("message");
      expect(result[0].type).toBe("textarea");
      expect(result[0].label).toBe("Message");
      expect(result[0].required).toBe(true);
      expect(result[0].template).toBe("form-field-textarea.html");
    });

    test("handles empty array", () => {
      const result = addFieldTemplates([]);
      expect(result).toEqual([]);
    });

    test("handles mixed field types", () => {
      const fields = [
        { name: "name", type: "text" },
        { name: "message", type: "textarea" },
        { name: "country", type: "select" },
        { name: "contact", type: "radio" },
      ];
      const result = addFieldTemplates(fields);
      expectProp("template")(result, [
        "form-field-input.html",
        "form-field-textarea.html",
        "form-field-select.html",
        "form-field-radio.html",
      ]);
    });

    test("does not mutate original fields array", () => {
      const original = [{ name: "test", type: "text" }];
      const originalCopy = JSON.parse(JSON.stringify(original));
      addFieldTemplates(original);
      expect(original).toEqual(originalCopy);
    });
  });

  // processContactForm function tests
  describe("processContactForm", () => {
    test("processes contact form data with fields", () => {
      const data = {
        submitButtonText: "Send",
        fields: [
          { name: "name", type: "text" },
          { name: "email", type: "email" },
        ],
      };
      const result = processContactForm(data);
      expect(result.submitButtonText).toBe("Send");
      expect(result.fields[0].template).toBe("form-field-input.html");
      expect(result.fields[1].template).toBe("form-field-input.html");
    });

    test("preserves all top-level properties", () => {
      const data = {
        submitButtonText: "Send Message",
        successMessage: "Thanks!",
        fields: [{ name: "test", type: "text" }],
      };
      const result = processContactForm(data);
      expectObjectProps({
        submitButtonText: "Send Message",
        successMessage: "Thanks!",
      })(result);
    });

    test("does not mutate original data", () => {
      const original = {
        fields: [{ name: "test", type: "text" }],
      };
      const originalCopy = JSON.parse(JSON.stringify(original));
      processContactForm(original);
      expect(original).toEqual(originalCopy);
    });
  });

  // Integration test: verify contact-form.js data file exports default function
  test("contact-form.js data file exports a default function for Eleventy", async () => {
    const contactFormModule = await import("#data/contact-form.js");
    expect(typeof contactFormModule.default).toBe("function");
    // Verify it only has default export (no named exports that would break Eleventy)
    const exportNames = Object.keys(contactFormModule);
    expect(exportNames).toHaveLength(1);
    expect(exportNames[0]).toBe("default");
  });

  test("contact-form.js returns processed fields with templates", async () => {
    const contactFormModule = await import("#data/contact-form.js");
    const contactForm = contactFormModule.default();
    expect(Array.isArray(contactForm.fields)).toBe(true);
    // All fields should have template property
    for (const field of contactForm.fields) {
      expect(typeof field.template).toBe("string");
      expect(field.template).toMatch(/^form-field-.*\.html$/);
    }
  });
});
