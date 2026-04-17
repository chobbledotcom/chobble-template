/* jscpd:ignore-start */
import { SPLIT_BASE_FIELDS, str } from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-callout";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_icon: {
    ...str("Icon (Iconify ID, emoji, or path)"),
    description:
      "Icon content: Iconify ID (`prefix:name`), emoji, or image path.",
  },
  figure_title: {
    ...str("Callout Title"),
    required: true,
    description: "Bold heading text in the callout box.",
  },
  figure_subtitle: {
    ...str("Callout Subtitle"),
    description: "Supporting text below the title.",
  },
  figure_variant: {
    ...str("Callout Color Variant"),
    default: '"primary"',
    description:
      'Color scheme: `"primary"`, `"secondary"`, `"gradient"`, or a custom CSS gradient string.',
  },
};

export const docs = {
  summary:
    "Two-column layout with text content and a styled callout box with icon, title, and subtitle.",
  template: "src/_includes/design-system/split-callout.html",
  scss: "src/css/design-system/_split-callout.scss",
  htmlRoot: '<div class="split-callout">',
};
