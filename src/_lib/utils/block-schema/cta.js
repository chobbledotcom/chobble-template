import {
  BUTTON_FIELDS_WITH_SIZE,
  md,
  objectField,
  TITLE_REQUIRED,
} from "#utils/block-schema/shared.js";

export const type = "cta";

export const fields = {
  title: { ...TITLE_REQUIRED, description: "CTA heading (`<h2>`)." },
  description: {
    ...md("Description"),
    description:
      "Supporting markdown text. `body-lg`, 0.9 opacity, max-width `$width-narrow`.",
  },
  button: {
    ...objectField("Button", BUTTON_FIELDS_WITH_SIZE),
    description:
      '`{text, href, variant, size}`. Default variant: `"secondary"`, default size: `"lg"`.',
  },
  reveal: { type: "string", description: "`data-reveal` value." },
};

export const docs = {
  summary: "Call-to-action banner with gradient background.",
  template: "src/_includes/design-system/cta.html",
  scss: "src/css/design-system/_cta.scss",
  htmlRoot: '<aside class="cta">',
};
