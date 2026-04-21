/**
 * @typedef {"text" | "email" | "tel" | "date" | "textarea" | "select" | "radio" | "heading"} FieldType
 */

/**
 * @typedef {object} ContactFormField
 * @property {string} name - Field name (used as form input name)
 * @property {string} [label] - Human-readable label
 * @property {FieldType | string} [type] - Field type; unknown strings fall back to "text"
 * @property {string} [placeholder]
 * @property {boolean} [required]
 * @property {number} [rows]
 * @property {string[]} [options] - Options for select/radio fields
 * @property {string} [note]
 * @property {string} [fieldClass]
 * @property {boolean} [half]
 * @property {boolean} [defaultFromPageTitle]
 * @property {string} [showOn] - Only render when this tag is present on the page
 * @property {boolean} [showForItemTag] - Rewrite field name/label from itemTagLabels
 * @property {string} [template] - Resolved template path (added by addFieldTemplates)
 */

/**
 * @typedef {ContactFormField & { template: string }} ResolvedContactFormField
 */

/**
 * @typedef {object} ContactFormData
 * @property {ContactFormField[]} fields
 * @property {Record<string, string>} itemTagLabels
 */

/**
 * @typedef {object} TagMatch
 * @property {string} tag
 * @property {string} label
 * @property {string} name
 */

/**
 * Resolves visibility and dynamic labels for contact form fields from page tags.
 * @param {ContactFormData} contactForm
 * @param {readonly string[] | undefined} tags Page tags from Eleventy (may be absent on non-item pages).
 * @param {boolean} [skipShowOn]
 * @returns {ContactFormField[]}
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

  /** @param {ContactFormField} field */
  const resolveShowOn = (field) => {
    if (skipShowOn || !field.showOn) return [];
    return tagList.includes(field.showOn) ? [field] : [];
  };

  /** @param {ContactFormField} field */
  const resolveItemTagField = (field) => {
    if (!match) return [];
    return [
      {
        ...field,
        showForItemTag: undefined,
        label: match.label,
        name: match.name,
      },
    ];
  };

  /** @param {ContactFormField} field */
  const resolveField = (field) => {
    if (field.showOn) return resolveShowOn(field);
    if (field.showForItemTag) return resolveItemTagField(field);
    return [field];
  };

  return contactForm.fields.flatMap(resolveField);
}

/**
 * @param {ContactFormField} field
 * @returns {string}
 */
export function getFieldTemplate(field) {
  switch (field.type) {
    case "textarea":
      return "form-field-textarea.html";
    case "select":
      return "form-field-select.html";
    case "radio":
      return "form-field-radio.html";
    case "heading":
      return "form-field-heading.html";
    default:
      return "form-field-input.html";
  }
}

/**
 * @param {ContactFormField[]} fields
 * @returns {ResolvedContactFormField[]}
 */
export function addFieldTemplates(fields) {
  return fields.map((field) => ({
    ...field,
    template: getFieldTemplate(field),
  }));
}

/**
 * @template {ContactFormData} T
 * @param {T} data
 * @returns {Omit<T, "fields"> & { fields: ResolvedContactFormField[] }}
 */
export function processContactForm(data) {
  return {
    ...data,
    fields: addFieldTemplates(data.fields),
  };
}
