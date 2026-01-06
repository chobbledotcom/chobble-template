import { describe, expect, test } from "bun:test";
import {
  buildSections,
  processQuoteFields,
} from "#config/quote-fields-helpers.js";
import { expectProp } from "#test/test-utils.js";

const expectTitles = expectProp("title");
const expectStepNumbers = expectProp("stepNumber");
const expectIsFirst = expectProp("isFirst");
const expectIsLast = expectProp("isLast");

describe("quote-fields-helpers", () => {
  // buildSections function tests
  describe("buildSections", () => {
    test("builds sections with metadata", () => {
      const sections = [
        { title: "Section 1", fields: [{ name: "a", type: "text" }] },
        { title: "Section 2", fields: [{ name: "b", type: "email" }] },
      ];
      const result = buildSections(sections);

      expectTitles(result, ["Section 1", "Section 2"]);
      expectStepNumbers(result, [0, 1]);
      expectIsFirst(result, [true, false]);
      expectIsLast(result, [false, true]);
    });

    test("adds templates to fields", () => {
      const sections = [
        {
          title: "Test",
          fields: [
            { name: "text", type: "text" },
            { name: "area", type: "textarea" },
          ],
        },
      ];
      const result = buildSections(sections);
      expect(result[0].fields[0].template).toBe("form-field-input.html");
      expect(result[0].fields[1].template).toBe("form-field-textarea.html");
    });

    test("single section is both first and last", () => {
      const sections = [
        { title: "Only", fields: [{ name: "solo", type: "text" }] },
      ];
      const result = buildSections(sections);
      expectIsFirst(result, [true]);
      expectIsLast(result, [true]);
    });
  });

  // processQuoteFields function tests
  describe("processQuoteFields", () => {
    test("processes complete quote fields data", () => {
      const data = {
        sections: [
          { title: "Event", fields: [{ name: "date", type: "date" }] },
          { title: "Contact", fields: [{ name: "name", type: "text" }] },
        ],
        recapTitle: "Review",
        submitButtonText: "Send",
      };
      const result = processQuoteFields(data);

      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe("Event");
      expect(result.sections[1].title).toBe("Contact");
      expect(result.totalSteps).toBe(3); // 2 sections + recap
      expect(result.recapTitle).toBe("Review");
      expect(result.submitButtonText).toBe("Send");
    });

    test("adds templates to section fields", () => {
      const data = {
        sections: [
          { title: "Part 1", fields: [{ name: "text", type: "text" }] },
          { title: "Part 2", fields: [{ name: "area", type: "textarea" }] },
        ],
        recapTitle: "Review",
        submitButtonText: "Submit",
      };
      const result = processQuoteFields(data);
      expect(result.sections[0].fields[0].template).toBe(
        "form-field-input.html",
      );
      expect(result.sections[1].fields[0].template).toBe(
        "form-field-textarea.html",
      );
    });
  });

  // Integration test: verify quote-fields.js data file exports default function
  test("quote-fields.js data file exports a default function for Eleventy", async () => {
    const quoteFieldsModule = await import("#data/quote-fields.js");
    expect(typeof quoteFieldsModule.default).toBe("function");
    // Verify it only has default export (no named exports that would break Eleventy)
    const exportNames = Object.keys(quoteFieldsModule);
    expect(exportNames).toHaveLength(1);
    expect(exportNames[0]).toBe("default");
  });

  test("quote-fields.js returns processed data with sections", async () => {
    const quoteFieldsModule = await import("#data/quote-fields.js");
    const quoteFields = quoteFieldsModule.default();
    expect(Array.isArray(quoteFields.sections)).toBe(true);
    expect(typeof quoteFields.totalSteps).toBe("number");
    expect(typeof quoteFields.recapTitle).toBe("string");
    expect(typeof quoteFields.submitButtonText).toBe("string");
    // All section fields should have template property
    for (const section of quoteFields.sections) {
      for (const field of section.fields) {
        expect(typeof field.template).toBe("string");
      }
    }
  });
});
