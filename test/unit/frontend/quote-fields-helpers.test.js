import { describe, expect, test } from "bun:test";
import {
  buildSections,
  processQuoteFields,
} from "#config/quote-fields-helpers.js";
import { expectProp } from "#test/test-utils.js";

const expectStepNumbers = expectProp("stepNumber");
const expectIsFirst = expectProp("isFirst");
const expectIsLast = expectProp("isLast");

// Helper to create minimal quote fields test data
const createQuoteData = (sections) => ({
  quoteStepName: "Items",
  sections,
  recapTitle: "Done",
  submitButtonText: "Submit",
});

describe("quote-fields-helpers", () => {
  // buildSections function tests
  describe("buildSections", () => {
    test("builds sections with metadata", () => {
      const sections = [
        {
          fields: [
            { type: "heading", title: "Section 1" },
            { name: "a", type: "text" },
          ],
        },
        {
          fields: [
            { type: "heading", title: "Section 2" },
            { name: "b", type: "email" },
          ],
        },
      ];
      const result = buildSections(sections);

      expectStepNumbers(result, [0, 1]);
      expectIsFirst(result, [true, false]);
      expectIsLast(result, [false, true]);
    });

    test("adds templates to fields", () => {
      const sections = [
        {
          fields: [
            { type: "heading", title: "Test" },
            { name: "text", type: "text" },
            { name: "area", type: "textarea" },
          ],
        },
      ];
      const result = buildSections(sections);
      expect(result[0].fields[0].template).toBe("form-field-heading.html");
      expect(result[0].fields[1].template).toBe("form-field-input.html");
      expect(result[0].fields[2].template).toBe("form-field-textarea.html");
    });

    test("adds fieldIndex to each field", () => {
      const sections = [
        {
          fields: [
            { type: "heading", title: "Test" },
            { name: "a", type: "text" },
            { name: "b", type: "text" },
          ],
        },
      ];
      const result = buildSections(sections);
      expect(result[0].fields[0].fieldIndex).toBe(0);
      expect(result[0].fields[1].fieldIndex).toBe(1);
      expect(result[0].fields[2].fieldIndex).toBe(2);
    });

    test("single section is both first and last", () => {
      const sections = [
        {
          fields: [
            { type: "heading", title: "Only" },
            { name: "solo", type: "text" },
          ],
        },
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
        quoteStepName: "Your Items",
        sections: [
          {
            fields: [
              { type: "heading", title: "Event" },
              { name: "date", type: "date" },
            ],
          },
          {
            fields: [
              { type: "heading", title: "Contact" },
              { name: "name", type: "text" },
            ],
          },
        ],
        recapTitle: "Review",
        submitButtonText: "Send",
      };
      const result = processQuoteFields(data);

      expect(result.sections.length).toBe(2);
      expect(result.totalSteps).toBe(3); // 2 sections + recap
      expect(result.steps).toEqual([
        { name: "Your Items", number: 1 },
        { name: "Event", number: 2 },
        { name: "Contact", number: 3 },
        { name: "Review", number: 4 },
      ]);
      expect(result.recapTitle).toBe("Review");
      expect(result.submitButtonText).toBe("Send");
    });

    test("extracts step names from heading fields", () => {
      const result = processQuoteFields(
        createQuoteData([
          { fields: [{ type: "heading", title: "First" }, { name: "a" }] },
          { fields: [{ type: "heading", title: "Second" }, { name: "b" }] },
        ]),
      );
      expect(result.steps[1].name).toBe("First");
      expect(result.steps[2].name).toBe("Second");
    });

    test("uses empty string for step name when no heading field exists", () => {
      const result = processQuoteFields(
        createQuoteData([{ fields: [{ name: "a", type: "text" }] }]),
      );
      expect(result.steps[1].name).toBe("");
    });

    test("finds heading title even if not first field in section", () => {
      const result = processQuoteFields(
        createQuoteData([
          { fields: [{ name: "a" }, { type: "heading", title: "Later" }] },
        ]),
      );
      expect(result.steps[1].name).toBe("Later");
    });

    test("excludes heading fields from fieldLabels", () => {
      const data = {
        sections: [
          {
            fields: [
              { type: "heading", title: "Section" },
              { name: "email", type: "email", label: "Email Address" },
            ],
          },
        ],
        recapTitle: "Review",
        submitButtonText: "Submit",
      };
      const result = processQuoteFields(data);
      expect(result.fieldLabels).toEqual({ email: "Email Address" });
      expect(result.fieldLabels.heading).toBeUndefined();
    });

    test("adds templates to section fields", () => {
      const data = {
        sections: [
          {
            fields: [
              { type: "heading", title: "Part 1" },
              { name: "text", type: "text" },
            ],
          },
          {
            fields: [
              { type: "heading", title: "Part 2" },
              { name: "area", type: "textarea" },
            ],
          },
        ],
        recapTitle: "Review",
        submitButtonText: "Submit",
      };
      const result = processQuoteFields(data);
      expect(result.sections[0].fields[0].template).toBe(
        "form-field-heading.html",
      );
      expect(result.sections[0].fields[1].template).toBe(
        "form-field-input.html",
      );
      expect(result.sections[1].fields[0].template).toBe(
        "form-field-heading.html",
      );
      expect(result.sections[1].fields[1].template).toBe(
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
    expect(Array.isArray(quoteFields.steps)).toBe(true);
    expect(quoteFields.steps.length).toBe(quoteFields.totalSteps + 1);
    // Each step should have name and number
    for (const step of quoteFields.steps) {
      expect(typeof step.name).toBe("string");
      expect(typeof step.number).toBe("number");
    }
    expect(typeof quoteFields.recapTitle).toBe("string");
    expect(typeof quoteFields.submitButtonText).toBe("string");
    // All section fields should have template property
    for (const section of quoteFields.sections) {
      for (const field of section.fields) {
        expect(typeof field.template).toBe("string");
      }
    }
  });

  test("quote-fields.js heading fields have fieldIndex for HR rendering", async () => {
    const quoteFieldsModule = await import("#data/quote-fields.js");
    const quoteFields = quoteFieldsModule.default();
    // First heading should have fieldIndex 0 (no HR)
    const firstSection = quoteFields.sections[0];
    const firstHeading = firstSection.fields.find(
      (f) => f.type === "heading",
    );
    expect(firstHeading.fieldIndex).toBe(0);
  });
});
