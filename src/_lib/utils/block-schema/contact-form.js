import { HEADER_KEYS, HEADER_PARAM_DOCS } from "#utils/block-schema/shared.js";

export const type = "contact_form";

export const schema = ["content", ...HEADER_KEYS];

export const docs = {
  summary: "Two-column layout with prose content and a contact form.",
  template: "src/_includes/design-system/contact-form-block.html",
  scss: "src/css/design-system/_contact-form-block.scss",
  htmlRoot: '<div class="contact-form-block">',
  params: {
    content: {
      type: "string",
      description:
        "Left-side content. Rendered as markdown in `.prose`. Centered text.",
    },
    ...HEADER_PARAM_DOCS,
  },
};
