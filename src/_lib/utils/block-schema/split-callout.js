/* jscpd:ignore-start */
import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
  str,
} from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-callout";

export const schema = [
  ...SPLIT_BASE_SCHEMA,
  "figure_icon",
  "figure_title",
  "figure_subtitle",
  "figure_variant",
];

export const docs = {
  summary:
    "Two-column layout with text content and a styled callout box with icon, title, and subtitle.",
  template: "src/_includes/design-system/split-callout.html",
  scss: "src/css/design-system/_split-callout.scss",
  htmlRoot: '<div class="split-callout">',
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_icon: {
      type: "string",
      description:
        "Icon content: Iconify ID (`prefix:name`), emoji, or image path.",
    },
    figure_title: {
      type: "string",
      required: true,
      description: "Bold heading text in the callout box.",
    },
    figure_subtitle: {
      type: "string",
      description: "Supporting text below the title.",
    },
    figure_variant: {
      type: "string",
      default: '"primary"',
      description:
        'Color scheme: `"primary"`, `"secondary"`, `"gradient"`, or a custom CSS gradient string.',
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_icon: str("Icon (Iconify ID, emoji, or path)"),
  figure_title: str("Callout Title", { required: true }),
  figure_subtitle: str("Callout Subtitle"),
  figure_variant: str("Callout Color Variant"),
};
