import { describe, expect, test } from "bun:test";
import {
  buildSections,
  buildStepNames,
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

  // buildStepNames function tests
  describe("buildStepNames", () => {
    test("builds step names array with quote step, section titles, and recap", () => {
      const data = {
        quoteStepName: "Your Items",
        recapTitle: "Review",
      };
      const sections = [{ title: "Event" }, { title: "Contact" }];
      const result = buildStepNames(data, sections);

      expect(result).toEqual(["Your Items", "Event", "Contact", "Review"]);
    });

    test("uses defaults when quoteStepName is missing", () => {
      const data = { recapTitle: "Summary" };
      const sections = [{ title: "Details" }];
      const result = buildStepNames(data, sections);

      expect(result).toEqual(["Your Items", "Details", "Summary"]);
    });

    test("uses default recap title when missing", () => {
      const data = { quoteStepName: "Cart" };
      const sections = [{ title: "Info" }];
      const result = buildStepNames(data, sections);

      expect(result).toEqual(["Cart", "Info", "Review"]);
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
      expect(result.stepNames).toEqual([
        "Your Items",
        "Event",
        "Contact",
        "Review",
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
    expect(Array.isArray(quoteFields.stepNames)).toBe(true);
    expect(quoteFields.stepNames.length).toBe(quoteFields.totalSteps + 1);
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
