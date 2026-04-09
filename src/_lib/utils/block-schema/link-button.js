import { REVEAL_PARAM } from "#utils/block-schema/shared.js";

export const type = "link-button";

export const schema = ["text", "href", "variant", "size", "reveal"];

export const docs = {
  summary: "Standalone centered button linking to an anchor or URL.",
  template: "src/_includes/design-system/link-button.html",
  scss: "src/css/design-system/_link-button.scss",
  htmlRoot: '<div class="link-button">',
  params: {
    text: {
      type: "string",
      required: true,
      description: "Button label.",
    },
    href: {
      type: "string",
      required: true,
      description: 'Link URL or anchor (e.g. `"#contact"`, `"/about"`).',
    },
    variant: {
      type: "string",
      default: '"primary"',
      description: '`"primary"`, `"secondary"`, or `"ghost"`.',
    },
    size: {
      type: "string",
      description: '`"sm"`, `"lg"`, or omit for default.',
    },
    reveal: REVEAL_PARAM,
  },
};
