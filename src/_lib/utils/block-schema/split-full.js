import {
  BUTTON_FIELDS_BASE,
  md,
  num,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "split-full";

export const schema = [
  "variant",
  "title_level",
  "left_title",
  "left_content",
  "left_button",
  "right_title",
  "right_content",
  "right_button",
  "reveal_left",
  "reveal_right",
];

export const docs = {
  summary:
    "Full-width two-panel layout with distinct background colors per side.",
  template: "src/_includes/design-system/split-full.html",
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split-full">',
  notes:
    'Variants: `"dark-left"` / `"dark-right"` (dark bg + light text), `"primary-left"` / `"primary-right"` (`--color-link` bg + contrast text). Button colors automatically invert in dark/primary panels. The parent `<section>` has zero padding — panels handle their own padding.',
  params: {
    variant: {
      type: "string",
      description:
        'Color scheme: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`.',
    },
    title_level: {
      type: "number",
      default: "2",
      description: "Heading level for both sides.",
    },
    left_title: {
      type: "string",
      description: "Left panel heading.",
    },
    left_content: {
      type: "string",
      description: "Left panel content (rendered as markdown via `.prose`).",
    },
    left_button: {
      type: "object",
      description: "`{text, href, variant}`.",
    },
    right_title: {
      type: "string",
      description: "Right panel heading.",
    },
    right_content: {
      type: "string",
      description: "Right panel content (rendered as markdown via `.prose`).",
    },
    right_button: {
      type: "object",
      description: "`{text, href, variant}`.",
    },
    reveal_left: {
      type: "string",
      description: "`data-reveal` for left panel.",
    },
    reveal_right: {
      type: "string",
      description: "`data-reveal` for right panel.",
    },
  },
};

export const cmsFields = {
  variant: str("Variant"),
  title_level: num("Heading Level"),
  reveal_left: str("Reveal Left Animation"),
  reveal_right: str("Reveal Right Animation"),
  left_title: str("Left Title"),
  left_content: md("Left Content"),
  left_button: objectField("Left Button", BUTTON_FIELDS_BASE),
  right_title: str("Right Title"),
  right_content: md("Right Content"),
  right_button: objectField("Right Button", BUTTON_FIELDS_BASE),
};
