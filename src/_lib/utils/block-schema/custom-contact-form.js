import {
  bool,
  INTRO_CONTENT_FIELD,
  md,
  num,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "custom-contact-form";

const FORM_FIELD_DEFINITIONS = objectList("Form Fields", {
  name: str("Field Name", { required: true }),
  label: str("Field Label", { required: true }),
  type: str("Field Type (text, email, tel, textarea, select, radio, heading)"),
  placeholder: str("Placeholder"),
  required: bool("Required"),
  rows: num("Rows (for textarea)"),
  note: str("Help Note"),
  fieldClass: str("CSS Class"),
});

export const fields = {
  content: {
    ...md("Intro Content"),
    description:
      "Left-side content. Rendered as markdown in `.prose`. Centered text.",
  },
  fields: {
    ...FORM_FIELD_DEFINITIONS,
    required: true,
    description:
      "Array of field definitions for this form. Replaces `contactForm.fields` for this block only.",
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Contact form block with a custom, block-level field list instead of the site-wide `contactForm.fields`.",
  template: "src/_includes/design-system/custom-contact-form-block.html",
  scss: "src/css/design-system/_contact-form-block.scss",
  htmlRoot: '<div class="contact-form-block">',
  notes:
    'Identical layout and styling to `contact-form`, but accepts its own `fields` array. Each field object follows the same shape as entries in `src/_data/contact-form.json` — e.g. `{name, label, type, placeholder, required, rows, options, note, fieldClass, showOn, defaultFromPageTitle}`. Supported `type` values: `"text"` (default), `"email"`, `"tel"`, `"textarea"`, `"select"`, `"radio"`, `"heading"`.',
};
