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

// Build array of step names for the progress indicator
export function buildStepNames(data, sections) {
  return [
    data.quoteStepName || "Your Items",
    ...sections.map((s) => s.title),
    data.recapTitle || "Review",
  ];
}

// Process the raw JSON into a structured format
export function processQuoteFields(data) {
  const sections = buildSections(data.sections);
  const stepNames = buildStepNames(data, sections);

  return {
    sections,
    totalSteps: sections.length + 1,
    stepNames,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
  };
}
