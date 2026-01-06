// Quote fields processing helpers

import { addFieldTemplates } from "#config/form-helpers.js";

// Build sections with metadata, adding templates to fields
export function buildSections(sections) {
  return sections.map((section, index) => ({
    title: section.title,
    fields: addFieldTemplates(section.fields),
    stepNumber: index,
    isFirst: index === 0,
    isLast: index === sections.length - 1,
  }));
}

// Process the raw JSON into a structured format
export function processQuoteFields(data) {
  const sections = buildSections(data.sections);

  const stepNames = [
    data.quoteStepName || "Your Items",
    ...sections.map((s) => s.title),
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
  };
}
