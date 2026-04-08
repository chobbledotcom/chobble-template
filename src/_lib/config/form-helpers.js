import { frozenObject } from "#toolkit/fp/object.js";

const fieldNameFromLabel = (label) => label.toLowerCase().replace(/\s+/g, "_");

/**
 * @typedef {object} ContactFormData
 * @property {object[]} fields
 * @property {Record<string, string>} currentItemTagLabelWhitelist
 */

/**
 * First entry in `whitelist` (object key order) whose key appears in `tagList`.
 * @param {readonly string[]} tagList
 * @param {Record<string, string>} whitelist
 * @returns {{ tag: string; label: string; name: string } | null}
 */
export const firstWhitelistMatch = (tagList, whitelist) => {
  for (const [tag, label] of Object.entries(whitelist)) {
    if (tagList.includes(tag)) {
      return { tag, label, name: fieldNameFromLabel(label) };
    }
  }
  return null;
};

/**
 * Resolves visibility and dynamic labels for contact form fields from page tags.
 * @param {ContactFormData} contactForm
 * @param {readonly string[] | undefined} tags Page tags from Eleventy (may be absent on non-item pages).
 * @param {boolean} [skipShowOn]
 * @returns {object[]}
 */
const resolveFieldForPage = (field, tagList, match, skipShowOn) => {
  if (field.showOn) {
    if (skipShowOn || !tagList.includes(field.showOn)) return [];
    return [field];
  }
  if (field.showOnCurrentItemTag) {
    if (!match) return [];
    const { showOnCurrentItemTag, ...rest } = field;
    return [{ ...rest, label: match.label, name: match.name }];
  }
  return [field];
};

export const resolveContactFormFieldsForPage = (
  contactForm,
  tags,
  skipShowOn = false,
) => {
  const tagList = Array.isArray(tags) ? tags : [];
  const match = firstWhitelistMatch(
    tagList,
    contactForm.currentItemTagLabelWhitelist,
  );
  return contactForm.fields.flatMap((field) =>
    resolveFieldForPage(field, tagList, match, skipShowOn),
  );
};

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
