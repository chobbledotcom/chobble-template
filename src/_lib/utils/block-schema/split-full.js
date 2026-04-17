import {
  BUTTON_FIELDS_BASE,
  md,
  num,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "split-full";

export const containerWidth = "full";

export const fields = {
  variant: {
    ...str("Variant"),
    description:
      'Color scheme: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`.',
  },
  title_level: {
    ...num("Heading Level"),
    default: "2",
    description: "Heading level for both sides.",
  },
  left_title: {
    ...str("Left Title"),
    description: "Left panel heading.",
  },
  left_content: {
    ...md("Left Content"),
    description: "Left panel content (rendered as markdown via `.prose`).",
  },
  left_button: {
    ...objectField("Left Button", BUTTON_FIELDS_BASE),
    description: "`{text, href, variant}`.",
  },
  right_title: {
    ...str("Right Title"),
    description: "Right panel heading.",
  },
  right_content: {
    ...md("Right Content"),
    description: "Right panel content (rendered as markdown via `.prose`).",
  },
  right_button: {
    ...objectField("Right Button", BUTTON_FIELDS_BASE),
    description: "`{text, href, variant}`.",
  },
  reveal_left: {
    ...str("Reveal Left Animation"),
    description: "`data-reveal` for left panel.",
  },
  reveal_right: {
    ...str("Reveal Right Animation"),
    description: "`data-reveal` for right panel.",
  },
};

export const docs = {
  summary:
    "Full-width two-panel layout with distinct background colors per side.",
  template: "src/_includes/design-system/split-full.html",
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split-full">',
  notes:
    'Variants: `"dark-left"` / `"dark-right"` (dark bg + light text), `"primary-left"` / `"primary-right"` (`--color-link` bg + contrast text). Button colors automatically invert in dark/primary panels. The parent `<section>` has zero padding — panels handle their own padding.',
};
