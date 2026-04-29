import { INTRO_CONTENT_FIELD, md } from "#utils/block-schema/shared.js";

export const type = "contact-form";

export const fields = {
  content: {
    ...md("Content"),
    description:
      "Left-side content. Rendered as markdown in `.prose`. Centered text.",
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary: "Two-column layout with prose content and a contact form.",
  template: "src/_includes/design-system/contact-form-block.html",
  scss: "src/css/design-system/_contact-form-block.scss",
  htmlRoot: '<div class="contact-form-block">',
};
