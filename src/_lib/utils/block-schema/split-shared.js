/* jscpd:ignore-start -- block schema declaration data */
/**
 * Shared unified fields for all split-* block types.
 *
 * Every split variant (split-image, split-code, split-icon-links, split-html,
 * split-callout) shares the same text-side fields. This module centralizes
 * them so each variant only adds its own figure-specific keys.
 */
import {
  bool,
  buttonFields,
  md,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

/** Unified fields shared by all split variants. */
export const SPLIT_BASE_FIELDS = {
  subtitle: {
    ...str("Subtitle"),
    description: "Subtitle with `.text-muted` styling.",
  },
  content: {
    ...md("Content"),
    description:
      'Main content with markdown headings (e.g. `## Heading`). Rendered through `renderContent: "md"` filter, wrapped in `.prose`.',
  },
  reverse: {
    ...bool("Reverse Layout"),
    default: false,
    description:
      "Reverses column order (content right, figure left) on desktop.",
  },
  reveal_content: {
    ...str("Reveal Content Animation"),
    /** @param {{ reverse?: boolean }} block */
    default: ({ reverse }) => (reverse ? "right" : "left"),
    description:
      '`data-reveal` for the text side. Defaults to `"left"`, or `"right"` when `reverse` is true.',
  },
  reveal_figure: {
    ...str("Reveal Figure Animation"),
    default: "scale",
    description: "`data-reveal` for the figure side.",
  },
  button: {
    ...objectField("Button", buttonFields({ variant: "secondary" })),
    description: "`{text, href, variant, size}`. Rendered below content.",
  },
};

/** Shared docs metadata for the split variants rendered by `split.html`. */
export const SPLIT_BASE_DOCS = {
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split">',
};
/* jscpd:ignore-end */
