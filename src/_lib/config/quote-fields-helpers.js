// Quote fields processing helpers

import { addFieldTemplates } from "#config/form-helpers.js";

// Split fields into sections by dividers using reduce
export function splitFieldsIntoSections(fields) {
  const result = fields.reduce(
    (acc, field) => {
      if (field.type === "divider") {
        return {
          sections: [...acc.sections, acc.current],
          current: [],
        };
      }
      return {
        sections: acc.sections,
        current: [...acc.current, field],
      };
    },
    { sections: [], current: [] },
  );

  // Include final section if it has fields
  return result.current.length > 0
    ? [...result.sections, result.current]
    : result.sections;
}

// Build sections with titles and metadata, adding templates to fields
export function buildSections(fieldSections, sectionTitles) {
  return fieldSections.map((fields, index) => ({
    title: sectionTitles[index],
    fields: addFieldTemplates(fields),
    stepNumber: index,
    isFirst: index === 0,
    isLast: index === fieldSections.length - 1,
  }));
}

// Process the raw JSON into a structured format
export function processQuoteFields(data) {
  const fieldSections = splitFieldsIntoSections(data.fields);
  const sections = buildSections(fieldSections, data.sectionTitles);

  return {
    sections,
    totalSteps: sections.length + 1,
    recapTitle: data.recapTitle,
    submitButtonText: data.submitButtonText,
    fields: addFieldTemplates(data.fields),
  };
}
