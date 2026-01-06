import { describe, expect, test } from "bun:test";
import {
  buildSections,
  buildSteps,
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

  // buildSteps function tests
  describe("buildSteps", () => {
    test("builds steps array with name and number for each step", () => {
      const data = {
        quoteStepName: "Your Items",
        recapTitle: "Review",
      };
      const sections = [{ title: "Event" }, { title: "Contact" }];
      const result = buildSteps(data, sections);

      expect(result).toEqual([
        { name: "Your Items", number: 1 },
        { name: "Event", number: 2 },
        { name: "Contact", number: 3 },
        { name: "Review", number: 4 },
      ]);
    });

    test("uses defaults when quoteStepName is missing", () => {
      const data = { recapTitle: "Summary" };
      const sections = [{ title: "Details" }];
      const result = buildSteps(data, sections);

      expect(result).toEqual([
        { name: "Your Items", number: 1 },
        { name: "Details", number: 2 },
        { name: "Summary", number: 3 },
      ]);
    });

    test("uses default recap title when missing", () => {
      const data = { quoteStepName: "Cart" };
      const sections = [{ title: "Info" }];
      const result = buildSteps(data, sections);

      expect(result).toEqual([
        { name: "Cart", number: 1 },
        { name: "Info", number: 2 },
        { name: "Review", number: 3 },
      ]);
    });
  });

  // processQuoteFields function tests
  describe("processQuoteFields", () => {
    test("processes complete quote fields data", () => {
      const data = {
        quoteStepName: "Your Items",
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
      expect(result.steps).toEqual([
        { name: "Your Items", number: 1 },
        { name: "Event", number: 2 },
        { name: "Contact", number: 3 },
        { name: "Review", number: 4 },
      ]);
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
});
