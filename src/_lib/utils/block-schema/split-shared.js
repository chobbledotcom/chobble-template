/**
 * Shared unified fields for all split-* block types.
 *
 * Every split variant (split-image, split-video, split-code, split-icon-links,
 * split-html) shares the same text-side fields. This module centralizes them
 * so each variant only adds its own figure-specific keys.
 */
import {
  BUTTON_FIELDS_WITH_SIZE,
  bool,
  md,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

// Re-export so split variants only need one import source.
export { md, str } from "#utils/block-schema/shared.js";

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
    default: "false",
    description:
      "Reverses column order (content right, figure left) on desktop.",
  },
  reveal_content: {
    ...str("Reveal Content Animation"),
    default: '"left"',
    description:
      '`data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true.',
  },
  reveal_figure: {
    ...str("Reveal Figure Animation"),
    default: '"scale"',
    description: "`data-reveal` for the figure side.",
  },
  button: {
    ...objectField("Button", BUTTON_FIELDS_WITH_SIZE),
    description:
      '`{text, href, variant}`. Rendered below content. Default variant: `"secondary"`.',
  },
};

/** Shared docs metadata for all split variants. */
export const SPLIT_BASE_DOCS = {
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split">',
};
