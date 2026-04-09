import { frozenObject, omit } from "#toolkit/fp/object.js";

/**
 * @typedef {object} ContactFormData
 * @property {object[]} fields
 * @property {Record<string, string>} itemTagLabels
 */

const FIELD_TYPE_TEMPLATES = frozenObject({
  textarea: "form-field-textarea.html",
  select: "form-field-select.html",
  radio: "form-field-radio.html",
  heading: "form-field-heading.html",
});

const DEFAULT_TEMPLATE = "form-field-input.html";

/**
 * Resolve a single contact form field based on page context.
 * @param {object} field
 * @param {string[]} tagList
 * @param {{ tag: string; label: string; name: string } | null} match
 * @param {boolean} skipShowOn
 * @returns {object[]}
 */
export const resolveField = (field, tagList, match, skipShowOn) => {
  if (field.showOn) {
    if (skipShowOn || !tagList.includes(field.showOn)) return [];
    return [field];
  }
  if (field.showForItemTag) {
    if (!match) return [];
    return [
      {
        ...omit(["showForItemTag"])(field),
        label: match.label,
        name: match.name,
      },
    ];
  }
  return [field];
};

/**
 * Resolves visibility and dynamic labels for contact form fields from page tags.
 * @param {ContactFormData} contactForm
 * @param {readonly string[] | undefined} tags Page tags from Eleventy (may be absent on non-item pages).
 * @param {boolean} [skipShowOn]
 * @returns {object[]}
 */
export function resolveFormFields(contactForm, tags, skipShowOn = false) {
  const tagList = Array.isArray(tags) ? tags : [];
  const matchEntry = Object.entries(contactForm.itemTagLabels).find(([tag]) =>
    tagList.includes(tag),
  );
  const match = matchEntry
    ? {
        tag: matchEntry[0],
        label: matchEntry[1],
        name: matchEntry[1].toLowerCase().replace(/\s+/g, "_"),
      }
    : null;
  return contactForm.fields.flatMap((field) =>
    resolveField(field, tagList, match, skipShowOn),
  );
}

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
