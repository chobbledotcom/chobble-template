import { describe, expect, test } from "bun:test";
import {
  buildSections,
  processQuoteFields,
  splitFieldsIntoSections,
} from "#config/quote-fields-helpers.js";

describe("quote-fields-helpers", () => {
  // splitFieldsIntoSections function tests
  describe("splitFieldsIntoSections", () => {
    test("splits fields at divider", () => {
      const fields = [
        { name: "field1", type: "text" },
        { type: "divider" },
        { name: "field2", type: "email" },
      ];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(1);
      expect(result[0][0].name).toBe("field1");
      expect(result[1].length).toBe(1);
      expect(result[1][0].name).toBe("field2");
    });

    test("handles multiple dividers", () => {
      const fields = [
        { name: "a", type: "text" },
        { type: "divider" },
        { name: "b", type: "text" },
        { type: "divider" },
        { name: "c", type: "text" },
      ];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(3);
      expect(result[0][0].name).toBe("a");
      expect(result[1][0].name).toBe("b");
      expect(result[2][0].name).toBe("c");
    });

    test("handles no dividers", () => {
      const fields = [
        { name: "field1", type: "text" },
        { name: "field2", type: "email" },
      ];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(2);
    });
  });

  // buildSections function tests
  describe("buildSections", () => {
    test("builds sections with titles and metadata", () => {
      const fieldSections = [
        [{ name: "a", type: "text" }],
        [{ name: "b", type: "email" }],
      ];
      const titles = ["Section 1", "Section 2"];
      const result = buildSections(fieldSections, titles);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe("Section 1");
      expect(result[0].stepNumber).toBe(0);
      expect(result[0].isFirst).toBe(true);
      expect(result[0].isLast).toBe(false);
      expect(result[1].title).toBe("Section 2");
      expect(result[1].stepNumber).toBe(1);
      expect(result[1].isFirst).toBe(false);
      expect(result[1].isLast).toBe(true);
    });

    test("adds templates to fields", () => {
      const fieldSections = [
        [
          { name: "text", type: "text" },
          { name: "area", type: "textarea" },
        ],
      ];
      const result = buildSections(fieldSections, ["Test"]);
      expect(result[0].fields[0].template).toBe("form-field-input.html");
      expect(result[0].fields[1].template).toBe("form-field-textarea.html");
    });

    test("single section is both first and last", () => {
      const fieldSections = [[{ name: "solo", type: "text" }]];
      const result = buildSections(fieldSections, ["Only"]);
      expect(result[0].isFirst).toBe(true);
      expect(result[0].isLast).toBe(true);
    });
  });

  // processQuoteFields function tests
  describe("processQuoteFields", () => {
    test("processes complete quote fields data", () => {
      const data = {
        fields: [
          { name: "date", type: "date" },
          { type: "divider" },
          { name: "name", type: "text" },
        ],
        sectionTitles: ["Event", "Contact"],
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

    test("includes flat fields array with templates", () => {
      const data = {
        fields: [
          { name: "text", type: "text" },
          { type: "divider" },
          { name: "area", type: "textarea" },
        ],
        sectionTitles: ["Part 1", "Part 2"],
        recapTitle: "Review",
        submitButtonText: "Submit",
      };
      const result = processQuoteFields(data);
      // Flat fields includes all including divider
      expect(result.fields.length).toBe(3);
      expect(result.fields[0].template).toBe("form-field-input.html");
      expect(result.fields[2].template).toBe("form-field-textarea.html");
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
