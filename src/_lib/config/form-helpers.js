import { frozenObject } from "#toolkit/fp/object.js";

const FIELD_TYPE_TEMPLATES = frozenObject({
  textarea: "form-field-textarea.html",
  select: "form-field-select.html",
  radio: "form-field-radio.html",
  heading: "form-field-heading.html",
});

const DEFAULT_TEMPLATE = "form-field-input.html";

export function getFieldTemplate(field) {
  return FIELD_TYPE_TEMPLATES[field.type] || DEFAULT_TEMPLATE;
}

export function addFieldTemplates(fields) {
  return fields.map((field) => ({
    ...field,
    template: getFieldTemplate(field),
  }));
}

export function processContactForm(data) {
  return {
    ...data,
    fields: addFieldTemplates(data.fields),
  };
}
