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

export function processQuoteFields(data) {
  const sections = buildSections(data.sections);

  const stepNames = [
    data.quoteStepName || "Your Items",
    ...data.sections.map((s) => s.title),
    data.recapTitle || "Review",
  ];
  const steps = stepNames.map((name, index) => ({
    name,
    number: index + 1,
  }));

  // Heading fields don't have name/label properties
  const allFields = data.sections.flatMap((section) =>
    section.fields.filter((field) => field.type !== "heading"),
  );

  return {
    sections,
    totalSteps: sections.length + 1,
    steps,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
    fieldLabels: toObject(allFields, (field) => [field.name, field.label]),
  };
}
