import { describe, expect, test } from "bun:test";
import {
  buildSections,
  processQuoteFields,
} from "#config/quote-fields-helpers.js";
import { expectProp } from "#test/test-utils.js";

const expectStepNumbers = expectProp("stepNumber");
const expectIsFirst = expectProp("isFirst");
const expectIsLast = expectProp("isLast");
const expectFieldIndex = expectProp("fieldIndex");
const expectTemplate = expectProp("template");

// Field factories
const heading = (title) => ({ type: "heading", title });
const field = (name, type = "text") => ({ name, type });

// Section factory
const section = (fields, title) => (title ? { title, fields } : { fields });

// Quote data factory with defaults
const quoteData = (sections, overrides = {}) => ({
  quoteStepName: "Items",
  sections,
  recapTitle: "Review",
  submitButtonText: "Submit",
  ...overrides,
});

describe("quote-fields-helpers", () => {
  describe("buildSections", () => {
    test("builds sections with metadata", () => {
      const result = buildSections([
        section([heading("Section 1"), field("a")]),
        section([heading("Section 2"), field("b", "email")]),
      ]);

      expectStepNumbers(result, [0, 1]);
      expectIsFirst(result, [true, false]);
      expectIsLast(result, [false, true]);
    });

    test("adds templates to fields", () => {
      const result = buildSections([
        section([heading("Test"), field("text"), field("area", "textarea")]),
      ]);

      expectTemplate(result[0].fields, [
        "form-field-heading.html",
        "form-field-input.html",
        "form-field-textarea.html",
      ]);
    });

    test("adds fieldIndex to each field", () => {
      const result = buildSections([
        section([heading("Test"), field("a"), field("b")]),
      ]);

      expectFieldIndex(result[0].fields, [0, 1, 2]);
    });

    test("single section is both first and last", () => {
      const result = buildSections([section([heading("Only"), field("solo")])]);

      expectIsFirst(result, [true]);
      expectIsLast(result, [true]);
    });
  });

  describe("processQuoteFields", () => {
    test("processes complete quote fields data", () => {
      const result = processQuoteFields(
        quoteData(
          [
            section([heading("Event Details"), field("date", "date")], "Event"),
            section([heading("Your Details"), field("name")], "Contact"),
          ],
          { quoteStepName: "Your Items", recapTitle: "Review" },
        ),
      );

      expect(result.sections.length).toBe(2);
      expect(result.totalSteps).toBe(3);
      expect(result.steps).toEqual([
        { name: "Your Items", number: 1 },
        { name: "Event", number: 2 },
        { name: "Contact", number: 3 },
        { name: "Review", number: 4 },
      ]);
    });

    test("uses section title for step names (not heading field title)", () => {
      const result = processQuoteFields(
        quoteData([section([heading("Different Heading")], "Step Name")]),
      );

      expect(result.steps[1].name).toBe("Step Name");
    });

    test("excludes heading fields from fieldLabels", () => {
      const result = processQuoteFields(
        quoteData([
          section([
            heading("Section"),
            { name: "email", type: "email", label: "Email Address" },
          ]),
        ]),
      );

      expect(result.fieldLabels).toEqual({ email: "Email Address" });
      expect(result.fieldLabels.heading).toBeUndefined();
    });

    test("adds templates to section fields", () => {
      const result = processQuoteFields(
        quoteData([
          section([heading("Part 1"), field("text")]),
          section([heading("Part 2"), field("area", "textarea")]),
        ]),
      );

      expectTemplate(result.sections[0].fields, [
        "form-field-heading.html",
        "form-field-input.html",
      ]);
      expectTemplate(result.sections[1].fields, [
        "form-field-heading.html",
        "form-field-textarea.html",
      ]);
    });
  });

  describe("integration tests", () => {
    test("quote-fields.js data file exports a default function for Eleventy", async () => {
      const quoteFieldsModule = await import("#data/quote-fields.js");

      expect(typeof quoteFieldsModule.default).toBe("function");
      expect(Object.keys(quoteFieldsModule)).toEqual(["default"]);
    });

    test("quote-fields.js returns processed data with sections", async () => {
      const quoteFieldsModule = await import("#data/quote-fields.js");
      const quoteFields = quoteFieldsModule.default();

      expect(Array.isArray(quoteFields.sections)).toBe(true);
      expect(typeof quoteFields.totalSteps).toBe("number");
      expect(Array.isArray(quoteFields.steps)).toBe(true);
      expect(quoteFields.steps.length).toBe(quoteFields.totalSteps + 1);

      for (const step of quoteFields.steps) {
        expect(typeof step.name).toBe("string");
        expect(typeof step.number).toBe("number");
      }

      expect(typeof quoteFields.recapTitle).toBe("string");
      expect(typeof quoteFields.submitButtonText).toBe("string");

      for (const s of quoteFields.sections) {
        for (const f of s.fields) {
          expect(typeof f.template).toBe("string");
        }
      }
    });

    test("quote-fields.js heading fields have fieldIndex for HR rendering", async () => {
      const quoteFieldsModule = await import("#data/quote-fields.js");
      const quoteFields = quoteFieldsModule.default();
      const firstHeading = quoteFields.sections[0].fields.find(
        (f) => f.type === "heading",
      );

      expect(firstHeading.fieldIndex).toBe(0);
    });
  });
});
