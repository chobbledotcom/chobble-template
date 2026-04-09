/**
 * Shared constants and parameter documentation used by multiple block modules.
 */

/** Keys for optional section-header rendering within a block. */
export const HEADER_KEYS = ["header_intro", "header_align", "header_class"];

/** @type {Record<string, {type: string, default?: string, description: string}>} */
export const HEADER_PARAM_DOCS = {
  header_intro: {
    type: "string",
    description: "Section header content rendered as markdown above the block.",
  },
  header_align: {
    type: "string",
    description: 'Header text alignment. `"center"` adds `.text-center`.',
  },
  header_class: {
    type: "string",
    description: "Extra CSS classes on the section header.",
  },
};

/** Reveal param doc for blocks that accept a string reveal value. */
export const REVEAL_PARAM = {
  type: "string",
  description: "`data-reveal` value.",
};

/** Reveal param doc for blocks where reveal is boolean (default true). */
export const REVEAL_BOOLEAN_PARAM = {
  type: "boolean",
  default: "true",
  description: "Adds `data-reveal` to each card.",
};

/** Extra CSS classes param doc. */
export const CLASS_PARAM = {
  type: "string",
  description: "Extra CSS classes.",
};

/** Shared schema keys for items and items_array blocks. */
export const ITEMS_COMMON_KEYS = [
  "intro",
  "horizontal",
  "masonry",
  "filter",
  ...HEADER_KEYS,
];

/** Shared param docs for items and items_array blocks (includes header params). */
export const ITEMS_COMMON_PARAMS = {
  intro: {
    type: "string",
    description: "Markdown content rendered above items in `.prose`.",
  },
  horizontal: {
    type: "boolean",
    default: "false",
    description:
      "If true, renders as a horizontal slider instead of a wrapping grid.",
  },
  masonry: {
    type: "boolean",
    default: "false",
    description:
      "If true, renders as a masonry grid using uWrap for zero-reflow height prediction.",
  },
  filter: {
    type: "object",
    description:
      'Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.title"`). `includes` matches substring, `equals` matches exact value.',
  },
  ...HEADER_PARAM_DOCS,
};

/** Shared param docs for video background blocks (video-background and bunny-video-background). */
export const VIDEO_BG_SHARED_PARAMS = {
  video_title: {
    type: "string",
    default: '"Background video"',
    description: "Accessible `title` on the iframe.",
  },
  aspect_ratio: {
    type: "string",
    default: '"16/9"',
    description: "CSS aspect-ratio on container.",
  },
};

/** Overlay content param doc for video-background and image-background. */
export const OVERLAY_CONTENT_PARAM = {
  type: "string",
  required: true,
  description:
    'Overlay content. Rendered as markdown in `<figcaption class="prose">`.',
};

/** Shared SCSS and htmlRoot for card-grid blocks (image-cards, gallery). */
export const ITEMS_GRID_META = {
  scss: "src/css/design-system/_items.scss",
  htmlRoot: '<ul class="items" role="list">',
};

/** Shared collection param for items and items_array blocks. */
export const COLLECTION_PARAM = (description) => ({
  type: "string",
  required: true,
  description,
});

/**
 * Factory for items/items_array block docs.
 * Both blocks share an identical docs shape modulo the summary, template,
 * collection description, and any extra params (like the `items` array).
 */
export const buildItemsDocs = ({
  summary,
  template,
  collectionDescription,
  extraParams = {},
}) => ({
  summary,
  template,
  scss: ITEMS_GRID_META.scss,
  params: {
    collection: COLLECTION_PARAM(collectionDescription),
    ...extraParams,
    ...ITEMS_COMMON_PARAMS,
  },
});

/** Required items array param (image-cards, gallery). */
export const ITEMS_ARRAY_PARAM = {
  type: "array",
  required: true,
};
