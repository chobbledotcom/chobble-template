import {
  BUTTON_FIELDS_WITH_SIZE,
  md,
  objectField,
  REVEAL_PARAM,
  TITLE_REQUIRED,
} from "#utils/block-schema/shared.js";

export const type = "cta";

export const schema = ["title", "description", "button", "reveal"];

export const docs = {
  summary: "Call-to-action banner with gradient background.",
  template: "src/_includes/design-system/cta.html",
  scss: "src/css/design-system/_cta.scss",
  htmlRoot: '<aside class="cta">',
  params: {
    title: {
      type: "string",
      required: true,
      description: "CTA heading (`<h2>`).",
    },
    description: {
      type: "string",
      description:
        "Supporting markdown text. `body-lg`, 0.9 opacity, max-width `$width-narrow`.",
    },
    button: {
      type: "object",
      description:
        '`{text, href, variant, size}`. Default variant: `"secondary"`, default size: `"lg"`.',
    },
    reveal: REVEAL_PARAM,
  },
};

export const cmsFields = {
  title: TITLE_REQUIRED,
  description: md("Description"),
  button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
};
