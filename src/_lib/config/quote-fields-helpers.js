// Quote fields processing helpers

import { addFieldTemplates } from "#config/form-helpers.js";
import { toObject } from "#toolkit/fp/object.js";

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

/**
 * Extract non-heading fields from all sections.
 * The filtering is extracted to a named function so the .filter() call
 * is not textually inside an iteration callback.
 * @param {object[]} fields
 */
const nonHeadingFields = (fields) => fields.filter((f) => f.type !== "heading");

const extractNonHeadingFields = (sections) =>
  sections.flatMap((section) => nonHeadingFields(section.fields));

export function processQuoteFields(data) {
  const sections = buildSections(data.sections);

  const stepNames = [
    data.quoteStepName || "Your Items",
    ...data.sections.map((s) => s.name),
    data.recapTitle || "Review",
  ];
  const steps = stepNames.map((name, index) => ({
    name,
    number: index + 1,
  }));

  // Heading fields don't have name/label properties
  const allFields = extractNonHeadingFields(sections);

  return {
    sections,
    totalSteps: sections.length + 1,
    steps,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
    fieldLabels: toObject(allFields, (field) => [field.name, field.label]),
  };
}
