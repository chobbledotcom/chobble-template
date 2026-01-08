// Form field processing helpers

// Map field types to their template includes
const FIELD_TYPE_TEMPLATES = {
  textarea: "form-field-textarea.html",
  select: "form-field-select.html",
  radio: "form-field-radio.html",
  heading: "form-field-heading.html",
};

const DEFAULT_TEMPLATE = "form-field-input.html";

// Add template property to a single field based on its type
export function getFieldTemplate(field) {
  return FIELD_TYPE_TEMPLATES[field.type] || DEFAULT_TEMPLATE;
}

// Add template property to each field in an array
export function addFieldTemplates(fields) {
  return fields.map((field) => ({
    ...field,
    template: getFieldTemplate(field),
  }));
}

// Process a contact form config, adding templates to all fields
export function processContactForm(data) {
  return {
    ...data,
    fields: addFieldTemplates(data.fields),
  };
}
