import { HEADER_KEYS, HEADER_PARAM_DOCS } from "#utils/block-schema/shared.js";

export const type = "custom_contact_form";

export const schema = ["content", "fields", ...HEADER_KEYS];

export const docs = {
  summary:
    "Contact form block with a custom, block-level field list instead of the site-wide `contactForm.fields`.",
  template: "src/_includes/design-system/custom-contact-form-block.html",
  scss: "src/css/design-system/_contact-form-block.scss",
  htmlRoot: '<div class="contact-form-block">',
  notes:
    'Identical layout and styling to `contact_form`, but accepts its own `fields` array. Each field object follows the same shape as entries in `src/_data/contact-form.json` — e.g. `{name, label, type, placeholder, required, rows, options, note, fieldClass, showOn, defaultFromPageTitle}`. Supported `type` values: `"text"` (default), `"email"`, `"tel"`, `"textarea"`, `"select"`, `"radio"`, `"heading"`.',
  params: {
    content: {
      type: "string",
      description:
        "Left-side content. Rendered as markdown in `.prose`. Centered text.",
    },
    fields: {
      type: "array",
      required: true,
      description:
        "Array of field definitions for this form. Replaces `contactForm.fields` for this block only.",
    },
    ...HEADER_PARAM_DOCS,
  },
};
