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

/** Shared schema keys for items and items-array blocks. */
export const ITEMS_COMMON_KEYS = [
  "intro",
  "horizontal",
  "masonry",
  "filter",
  ...HEADER_KEYS,
];

/** Shared param docs for items and items-array blocks (includes header params). */
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

/**
 * Shared CMS fields for video-background and bunny-video-background.
 * Gets spread into each block's cmsFields alongside its block-specific fields,
 * and also keeps the two modules from having identical field lists (which
 * would be flagged as duplication).
 */
export const videoBgSharedFields = () => ({
  video_title: str("Video Title"),
  aspect_ratio: str("Aspect Ratio"),
  class: str("CSS Class"),
  content: md("Overlay Content"),
});

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

/** Shared collection param for items and items-array blocks. */
export const COLLECTION_PARAM = (description) => ({
  type: "string",
  required: true,
  description,
});

/**
 * Factory for items/items-array block docs.
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

/**
 * CMS field factory functions.
 * These create the field-shape objects consumed by scripts/customise-cms/generator.js.
 */

/** @param {string} label @param {object} [extras] */
export const str = (label, extras) => ({ type: "string", label, ...extras });
/** @param {string} label */
export const md = (label) => ({ type: "markdown", label });
/** @param {string} label */
export const num = (label) => ({ type: "number", label });
/** @param {string} label */
export const bool = (label) => ({ type: "boolean", label });
/** @param {string} label @param {object} [extras] */
export const img = (label, extras) => ({ type: "image", label, ...extras });
/** @param {string} label @param {Record<string, object>} fields */
export const objectList = (label, fields) => ({
  type: "object",
  list: true,
  label,
  fields,
});
/** @param {string} label @param {Record<string, object>} fields */
export const objectField = (label, fields) => ({
  type: "object",
  label,
  fields,
});

/** Container wrapper fields common to every CMS block. */
export const CONTAINER_FIELDS = {
  container_width: str("Container Width (full, wide, narrow)"),
  section_class: str("Section Class"),
};

/** Button fields shared between hero, split, and cta blocks. */
export const BUTTON_FIELDS_BASE = {
  text: str("Button Text", { required: true }),
  href: str("URL", { required: true }),
  variant: str("Variant"),
};

/** Button fields with an additional size option. */
export const BUTTON_FIELDS_WITH_SIZE = {
  ...BUTTON_FIELDS_BASE,
  size: str("Size"),
};

/** Pre-built required title field. */
export const TITLE_REQUIRED = str("Title", { required: true });

/** Filter object field shared between items and items-array. */
export const FILTER_FIELD = objectField("Filter", {
  property: str("Property (e.g. url, data.title)"),
  includes: str("Contains"),
  equals: str("Equals"),
});

/** CMS fields shared between items and items-array blocks. */
export const ITEMS_CMS_SHARED_FIELDS = {
  collection: str("Collection Name", { required: true }),
  intro: md("Intro Content (Markdown)"),
  horizontal: bool("Horizontal Slider"),
  masonry: bool("Masonry Grid"),
  header_intro: md("Header Intro"),
  filter: FILTER_FIELD,
};
