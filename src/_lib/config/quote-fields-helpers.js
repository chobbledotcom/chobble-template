// Quote fields processing helpers

import { addFieldTemplates } from "#config/form-helpers.js";
import { toObject } from "#utils/object-entries.js";

// Build sections with metadata, adding templates and fieldClass to fields
export function buildSections(sections) {
  return sections.map((section, index) => ({
    fields: addFieldTemplates(section.fields).map((field, fieldIndex) => ({
      ...field,
      fieldClass: field.half ? "field-half" : undefined,
      fieldIndex,
    })),
    stepNumber: index,
    isFirst: index === 0,
    isLast: index === sections.length - 1,
  }));
}

// Build a flat mapping of field name -> label from all sections
// Excludes heading fields which don't have name/label properties
export function buildFieldLabels(sections) {
  const allFields = sections.flatMap((section) =>
    section.fields.filter((field) => field.type !== "heading"),
  );
  return toObject(allFields, (field) => [field.name, field.label]);
}

// Process the raw JSON into a structured format
export function processQuoteFields(data) {
  const sections = buildSections(data.sections);

  const stepNames = [
    data.quoteStepName || "Your Items",
    ...data.sections.map((s) => {
      const headingField = s.fields.find((field) => field.type === "heading");
      return headingField?.title || "";
    }),
    data.recapTitle || "Review",
  ];
  const steps = stepNames.map((name, index) => ({
    name,
    number: index + 1,
  }));

  return {
    sections,
    totalSteps: sections.length + 1,
    steps,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
    fieldLabels: buildFieldLabels(data.sections),
  };
}
