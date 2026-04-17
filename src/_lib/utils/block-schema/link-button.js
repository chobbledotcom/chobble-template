import { str } from "#utils/block-schema/shared.js";

export const type = "link-button";

export const fields = {
  text: {
    ...str("Button Text"),
    required: true,
    description: "Button label.",
  },
  href: {
    ...str("URL"),
    required: true,
    description: 'Link URL or anchor (e.g. `"#contact"`, `"/about"`).',
  },
  variant: {
    ...str("Variant"),
    default: '"primary"',
    description: '`"primary"`, `"secondary"`, or `"ghost"`.',
  },
  size: {
    ...str("Size"),
    description: '`"sm"`, `"lg"`, or omit for default.',
  },
  reveal: {
    ...str("Reveal Animation"),
    description: "`data-reveal` value.",
  },
};

export const docs = {
  summary: "Standalone centered button linking to an anchor or URL.",
  template: "src/_includes/design-system/link-button.html",
  scss: "src/css/design-system/_link-button.scss",
  htmlRoot: '<div class="link-button">',
};
