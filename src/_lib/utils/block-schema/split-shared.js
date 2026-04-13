/**
 * Shared constants for all split-* block types.
 *
 * Every split variant (split-image, split-video, split-code, split-icon-links,
 * split-html) shares the same text-side fields. This module centralizes them
 * so each variant only adds its own figure-specific keys.
 */
import {
  BUTTON_FIELDS_WITH_SIZE,
  bool,
  md,
  num,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

/** Schema keys shared by all split variants. */
export const SPLIT_BASE_SCHEMA = [
  "title",
  "title_level",
  "subtitle",
  "content",
  "reverse",
  "reveal_content",
  "reveal_figure",
  "button",
];

/** Documentation for shared split params. */
export const SPLIT_BASE_PARAMS = {
  title: { type: "string", description: "Section heading." },
  title_level: {
    type: "number",
    default: "2",
    description: "Heading level.",
  },
  subtitle: {
    type: "string",
    description: "Subtitle with `.text-muted` styling.",
  },
  content: {
    type: "string",
    description:
      'Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`.',
  },
  reverse: {
    type: "boolean",
    default: "false",
    description:
      "Reverses column order (content right, figure left) on desktop.",
  },
  reveal_content: {
    type: "string",
    default: '"left"',
    description:
      '`data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true.',
  },
  reveal_figure: {
    type: "string",
    default: '"scale"',
    description: "`data-reveal` for the figure side.",
  },
  button: {
    type: "object",
    description:
      '`{text, href, variant}`. Rendered below content. Default variant: `"secondary"`.',
  },
};

/** Shared docs metadata for all split variants. */
export const SPLIT_BASE_DOCS = {
  template: "src/_includes/design-system/split.html",
  scss: "src/css/design-system/_split.scss",
  htmlRoot: '<div class="split">',
};

/** CMS fields shared by all split variants. */
export const SPLIT_BASE_CMS_FIELDS = {
  title: str("Title"),
  title_level: num("Heading Level"),
  subtitle: str("Subtitle"),
  reverse: bool("Reverse Layout"),
  reveal_content: str("Reveal Content Animation"),
  reveal_figure: str("Reveal Figure Animation"),
  content: md("Content"),
  button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
};
