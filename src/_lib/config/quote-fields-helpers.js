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

// Build array of step objects for the progress indicator
export function buildSteps(data, sections) {
  const names = [
    data.quoteStepName || "Your Items",
    ...sections.map((s) => s.title),
    data.recapTitle || "Review",
  ];
  return names.map((name, index) => ({
    name,
    number: index + 1,
  }));
}

// Process the raw JSON into a structured format
export function processQuoteFields(data) {
  const sections = buildSections(data.sections);
  const steps = buildSteps(data, sections);

  return {
    sections,
    totalSteps: sections.length + 1,
    steps,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
  };
}
