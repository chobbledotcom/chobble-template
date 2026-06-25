/**
 * Shared constants and field factories for block modules.
 *
 * Each unified field object combines CMS metadata (type, label, required,
 * fields, list) with documentation metadata (description, default).
 * Fields WITH a `label` are CMS-exposed; fields WITHOUT are doc-only.
 */

/** @param {string} label @param {object} [extras] */
export const str = (label, extras) => ({ type: "string", label, ...extras });
/** @param {string} label @param {object} [extras] */
export const md = (label, extras) => ({ type: "markdown", label, ...extras });
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
  dark: bool("Dark"),
  compact: bool("Compact"),
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

/** Documented button styling fields shared by link-button-style blocks. */
export const LINK_BUTTON_STYLE_FIELDS = {
  variant: {
    ...str("Variant"),
    default: '"primary"',
    description: '`"primary"`, `"secondary"`, or `"ghost"`.',
  },
  size: {
    ...str("Size"),
    description: '`"sm"`, `"lg"`, or omit for default.',
  },
  reveal: {
    ...str("Reveal Animation"),
    description: "`data-reveal` value.",
  },
};

/** Pre-built required name field. */
export const NAME_REQUIRED = str("Name", { required: true });

/** Filter object field shared between items and items-array. */
export const FILTER_FIELD = objectField("Filter", {
  property: str("Property (e.g. url, data.name)"),
  includes: str("Contains"),
  equals: str("Equals"),
});

/** Shared SCSS and htmlRoot for card-grid blocks (image-cards, gallery). */
export const ITEMS_GRID_META = {
  scss: "src/css/design-system/_items.scss",
  htmlRoot: '<ul class="items" role="list">',
};

/** Unified markdown intro field rendered above a block in `.prose`. */
export const INTRO_CONTENT_FIELD = {
  ...md("Intro Content (Markdown)"),
  description: "Markdown content rendered above the block in `.prose`.",
};

/** Horizontal slider toggle shared between items-like blocks. */
export const HORIZONTAL_FIELD = {
  ...bool("Horizontal Slider"),
  default: "false",
  description:
    "If true, renders as a horizontal slider instead of a wrapping grid.",
};

/** Masonry grid toggle shared between items-like blocks. */
export const MASONRY_FIELD = {
  ...bool("Masonry Grid"),
  default: "false",
  description:
    "If true, renders as a masonry grid using uWrap for zero-reflow height prediction.",
};

/** Per-block aspect-ratio override for thumbnails / card images. */
export const IMAGE_ASPECT_RATIO_FIELD = {
  ...str("Image Aspect Ratio"),
  description: 'Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`.',
};

/**
 * Presentation fields shared by every items-style block (items, items-array,
 * category-products, …). Anything that controls *how* items render — but not
 * *which* items — lives here so the blocks stay in lock-step.
 */
export const ITEMS_PRESENTATION_FIELDS = {
  intro_content: INTRO_CONTENT_FIELD,
  horizontal: HORIZONTAL_FIELD,
  masonry: MASONRY_FIELD,
};

/**
 * Items-style fields plus the generic `filter` selector. Used by blocks that
 * let editors choose their own items (items, items-array). Sugar blocks like
 * `category-products` deliberately omit `filter` because they hardcode it.
 */
export const ITEMS_COMMON_FIELDS = {
  ...ITEMS_PRESENTATION_FIELDS,
  filter: {
    ...FILTER_FIELD,
    description:
      'Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.name"`). When the resolved value is an array, the operator runs against each element (per-element exact match for `equals`, per-element substring for `includes`). `includes` matches substring; `equals` matches exact value.',
  },
};

/**
 * Field set for "items-style sugar" blocks — those that hardcode the
 * collection and filter (e.g. `category-products`, `child-categories`) and
 * only need to expose how items render.
 */
export const ITEMS_SUGAR_FIELDS = {
  ...ITEMS_PRESENTATION_FIELDS,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
};

export const REVEAL_BOOLEAN_FIELD = {
  type: "boolean",
  default: "true",
  description: "Adds `data-reveal` to each item.",
};

export const REVEAL_STRING_FIELD = {
  type: "string",
  description: "`data-reveal` value.",
};

export const collectionField = (description) => ({
  ...str("Collection Name"),
  required: true,
  description,
});

/** @param {object} itemsField */
export const imageCardGridFields = (itemsField) => ({
  items: itemsField,
  reveal: REVEAL_BOOLEAN_FIELD,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
  intro_content: INTRO_CONTENT_FIELD,
});

/**
 * Hero-style content fields shared by `hero` and the `*-background` blocks:
 * optional badge, markdown content rendered in `.prose`, and action buttons.
 * Rendered by `design-system/hero-content.html`.
 */
export const HERO_CONTENT_FIELDS = {
  badge: {
    ...str("Badge Text"),
    description:
      'Small pill label above the content. Renders as `<span class="badge">`.',
  },
  content: {
    ...md("Content"),
    description: "Markdown content rendered in `.prose`.",
  },
  buttons: {
    ...objectList("Buttons", BUTTON_FIELDS_WITH_SIZE),
    description:
      'Action buttons below the content. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default.',
  },
  reveal: REVEAL_STRING_FIELD,
};

/** Overlay content + class fields shared between background blocks. */
export const OVERLAY_CONTENT_FIELDS = {
  class: { ...str("CSS Class"), description: "Extra CSS classes." },
  ...HERO_CONTENT_FIELDS,
  content: {
    ...HERO_CONTENT_FIELDS.content,
    description:
      "Markdown overlay content rendered in `.prose` inside the `<figcaption>`.",
  },
};

export const VIDEO_BG_SHARED_FIELDS = {
  video_title: {
    ...str("Video Title"),
    default: '"Background video"',
    description: "Accessible `title` on the iframe.",
  },
  ...OVERLAY_CONTENT_FIELDS,
};
