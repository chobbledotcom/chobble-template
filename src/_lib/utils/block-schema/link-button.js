import { LINK_BUTTON_STYLE_FIELDS, str } from "#utils/block-schema/shared.js";

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
  ...LINK_BUTTON_STYLE_FIELDS,
};

export const docs = {
  summary: "Standalone centered button linking to an anchor or URL.",
  scss: "src/css/design-system/_link-button.scss",
  htmlRoot: '<div class="link-button">',
};
