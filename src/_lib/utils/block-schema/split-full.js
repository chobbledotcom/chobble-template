/* jscpd:ignore-start -- block schema declaration data */
import {
  buttonFields,
  md,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "split-full";

export const columnSafe = false;

export const containerWidth = "full";

export const fields = {
  variant: {
    ...str("Variant"),
    description:
      'Color scheme: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`.',
  },
  left_content: {
    ...md("Left Content"),
    description:
      "Left panel content with markdown headings (e.g. `## Heading`). Rendered as markdown via `.prose`.",
  },
  left_button: {
    ...objectField("Left Button", buttonFields({ variant: "secondary" })),
    description: "`{text, href, variant, size}`.",
  },
  right_content: {
    ...md("Right Content"),
    description:
      "Right panel content with markdown headings (e.g. `## Heading`). Rendered as markdown via `.prose`.",
  },
  right_button: {
    ...objectField("Right Button", buttonFields({ variant: "secondary" })),
    description: "`{text, href, variant, size}`.",
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
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split-full">',
  notes:
    'Variants: `"dark-left"` / `"dark-right"` (dark bg + light text), `"primary-left"` / `"primary-right"` (`--color-link` bg + contrast text). Button colors automatically invert in dark/primary panels. The parent `<section>` has zero padding — panels handle their own padding.',
};

export const example = {
  type: "split-full",
  variant: "dark-left",
  left_content: "## Two panels\n\nEach side takes its own content and button.",
  left_button: {
    text: "Left action",
    href: "/how-it-works/",
    variant: "secondary",
  },
  right_content: "## Side by side\n\nVariants control which side is dark.",
  right_button: { text: "Right action", href: "/blocks/" },
};
/* jscpd:ignore-end */
