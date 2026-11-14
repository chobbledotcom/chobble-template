/* jscpd:ignore-start -- block schema declaration data */
import { str } from "#utils/block-schema/shared.js";
import { SPLIT_BASE_FIELDS } from "#utils/block-schema/split-shared.js";

export const type = "split-callout";

export const columnSafe = false;

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_icon: {
    ...str("Icon (Iconify ID, emoji, or path)"),
    description:
      "Icon content: Iconify ID (`prefix:name`), emoji, or image path.",
  },
  figure_name: {
    ...str("Callout Name"),
    required: true,
    description: "Bold heading text in the callout box.",
  },
  figure_subtitle: {
    ...str("Callout Subtitle"),
    description: "Supporting text below the name.",
  },
  figure_variant: {
    ...str("Callout Color Variant"),
    default: "primary",
    description:
      'Color scheme: `"primary"`, `"secondary"`, `"gradient"`, or a custom CSS gradient string.',
  },
};

export const docs = {
  summary:
    "Two-column layout with text content and a styled callout box with icon, name, and subtitle.",
  scss: "src/css/design-system/_split-callout.scss",
  htmlRoot: '<div class="split-callout">',
};

export const example = {
  type: "split-callout",
  subtitle: "Split layouts",
  content:
    "## Text beside a callout card\n\nGood for highlighting one key fact or contact route.",
  figure_icon: "hugeicons:call",
  figure_name: "Talk to a person",
  figure_subtitle: "Phone lines open 9-5, Monday to Friday.",
};
/* jscpd:ignore-end */
