/* jscpd:ignore-start -- block schema declaration data */
import {
  buttonFields,
  md,
  objectField,
  REVEAL_STRING_FIELD,
} from "#utils/block-schema/shared.js";

export const type = "cta";

export const fields = {
  content: {
    ...md("Content"),
    required: true,
    description:
      "Markdown content with optional heading (e.g. `## Heading`). `body-lg`, 0.9 opacity, max-width `$width-narrow`.",
  },
  button: {
    ...objectField(
      "Button",
      buttonFields({ variant: "secondary", size: "lg" }),
    ),
    description: "`{text, href, variant, size}`.",
  },
  reveal: REVEAL_STRING_FIELD,
};

export const docs = {
  summary: "Call-to-action banner with gradient background.",
  scss: "src/css/design-system/_cta.scss",
  htmlRoot: '<aside class="cta">',
};

export const example = {
  type: "cta",
  content:
    "## Ready to try it?\n\nA call-to-action closes the page with one clear next step.",
  button: { text: "How it works", href: "/how-it-works/", size: "lg" },
};
/* jscpd:ignore-end */
