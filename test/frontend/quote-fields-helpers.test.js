import { describe, expect, test } from "bun:test";
import {
  buildSections,
  DEFAULT_SECTION_TITLES,
  processQuoteFields,
  splitFieldsIntoSections,
} from "#config/quote-fields-helpers.js";

describe("quote-fields-helpers", () => {
  // DEFAULT_SECTION_TITLES constant tests
  describe("DEFAULT_SECTION_TITLES", () => {
    test("has expected default titles", () => {
      expect(DEFAULT_SECTION_TITLES).toEqual(["Event Details", "Your Details"]);
    });
  });

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

    test("handles empty array", () => {
      const result = splitFieldsIntoSections([]);
      expect(result).toEqual([]);
    });

    test("handles divider at start", () => {
      const fields = [{ type: "divider" }, { name: "field1", type: "text" }];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual([]);
      expect(result[1][0].name).toBe("field1");
    });

    test("handles divider at end", () => {
      const fields = [{ name: "field1", type: "text" }, { type: "divider" }];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(1);
      expect(result[0][0].name).toBe("field1");
    });

    test("handles consecutive dividers", () => {
      const fields = [
        { name: "field1", type: "text" },
        { type: "divider" },
        { type: "divider" },
        { name: "field2", type: "text" },
      ];
      const result = splitFieldsIntoSections(fields);
      expect(result.length).toBe(3);
      expect(result[0][0].name).toBe("field1");
      expect(result[1]).toEqual([]);
      expect(result[2][0].name).toBe("field2");
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

    test("uses fallback title when titles array is shorter", () => {
      const fieldSections = [
        [{ name: "a", type: "text" }],
        [{ name: "b", type: "text" }],
        [{ name: "c", type: "text" }],
      ];
      const titles = ["First"];
      const result = buildSections(fieldSections, titles);
      expect(result[0].title).toBe("First");
      expect(result[1].title).toBe("Step 2");
      expect(result[2].title).toBe("Step 3");
    });

    test("handles empty sections array", () => {
      const result = buildSections([], []);
      expect(result).toEqual([]);
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

    test("uses default section titles when not provided", () => {
      const data = {
        fields: [
          { name: "a", type: "text" },
          { type: "divider" },
          { name: "b", type: "text" },
        ],
      };
      const result = processQuoteFields(data);
      expect(result.sections[0].title).toBe("Event Details");
      expect(result.sections[1].title).toBe("Your Details");
    });

    test("uses default recap title when not provided", () => {
      const data = { fields: [{ name: "a", type: "text" }] };
      const result = processQuoteFields(data);
      expect(result.recapTitle).toBe("Review Your Request");
    });

    test("uses default submit button text when not provided", () => {
      const data = { fields: [{ name: "a", type: "text" }] };
      const result = processQuoteFields(data);
      expect(result.submitButtonText).toBe("Submit Quote Request");
    });

    test("handles empty fields array", () => {
      const data = { fields: [] };
      const result = processQuoteFields(data);
      expect(result.sections).toEqual([]);
      expect(result.totalSteps).toBe(1); // just recap
      expect(result.fields).toEqual([]);
    });

    test("handles missing fields property", () => {
      const data = {};
      const result = processQuoteFields(data);
      expect(result.sections).toEqual([]);
      expect(result.fields).toEqual([]);
    });

    test("includes flat fields array with templates", () => {
      const data = {
        fields: [
          { name: "text", type: "text" },
          { type: "divider" },
          { name: "area", type: "textarea" },
        ],
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
