/* jscpd:ignore-start -- block schema declaration data */
/**
 * Shared constants and field factories for block modules.
 *
 * Each unified field object combines CMS metadata (type, label, required,
 * fields, list) with documentation metadata (description) and an optional
 * typed `default`. Fields WITH a `label` are CMS-exposed; fields WITHOUT are
 * doc-only. `default` is executable: the block pipeline fills omitted fields
 * from it (see `applyBlockDefaults` in `#utils/block-schema.js`), so templates
 * never restate it. A function default derives its value from the object
 * that owns the field.
 */

/** @param {string} label @param {object} [extras] */
export const str = (label, extras) => ({ type: "string", label, ...extras });
/** @param {string} label @param {object} [extras] */
export const md = (label, extras) => ({ type: "markdown", label, ...extras });
/** @param {string} label */
export const num = (label) => ({ type: "number", label });
/** @param {string} label @param {object} [extras] */
export const bool = (label, extras) => ({ type: "boolean", label, ...extras });
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

/** Container wrapper fields common to every block. */
export const CONTAINER_FIELDS = {
  dark: bool("Dark", { default: false }),
  compact: bool("Compact"),
};

/**
 * Button fields used by every block that renders a button. Blocks differ
 * only in the style an omitted `variant` (and, for the CTA, `size`) takes.
 * @param {{ variant: string, size?: string }} defaults
 */
export const buttonFields = ({ variant, size }) => ({
  text: str("Button Text", { required: true }),
  href: str("URL", { required: true }),
  variant: str("Variant", { default: variant }),
  size: size ? str("Size", { default: size }) : str("Size"),
});

/** Collection filter shared by the collection-driven blocks. */
export const FILTER_FIELD = {
  ...objectField("Filter", {
    property: str("Property (e.g. url, data.name)"),
    includes: str("Contains"),
    equals: str("Equals"),
  }),
  description:
    'Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.name"`). When the resolved value is an array, the operator runs against each element (per-element exact match for `equals`, per-element substring for `includes`). `includes` matches substring; `equals` matches exact value.',
};

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
  default: false,
  description:
    "If true, renders as a horizontal slider instead of a wrapping grid.",
};

/** Masonry grid toggle shared between items-like blocks. */
export const MASONRY_FIELD = {
  ...bool("Masonry Grid"),
  default: false,
  description:
    "If true, renders as a masonry grid using uWrap for zero-reflow height prediction.",
};

/** Per-block aspect-ratio override for thumbnails / card images. */
export const IMAGE_ASPECT_RATIO_FIELD = {
  ...str("Image Aspect Ratio"),
  description: 'Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`.',
};

/**
 * Fields for blocks whose items editors choose themselves (items,
 * items-array): how the items render, which of them to show, and the
 * per-block aspect-ratio override.
 */
export const ITEMS_FILTERABLE_FIELDS = {
  intro_content: INTRO_CONTENT_FIELD,
  horizontal: HORIZONTAL_FIELD,
  masonry: MASONRY_FIELD,
  filter: FILTER_FIELD,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
};

/**
 * Doc-only toggle, on by default, that adds `data-reveal` to what a block renders.
 * @param {string} target - What gets revealed, e.g. "each stat"
 */
export const revealToggleField = (target) => ({
  type: "boolean",
  default: true,
  description: `Adds \`data-reveal\` to ${target}.`,
});

/** Doc-only `data-reveal` value for blocks that animate as a whole. */
export const REVEAL_STRING_FIELD = {
  type: "string",
  description: "`data-reveal` value.",
};

/** @param {string} description */
export const collectionField = (description) => ({
  ...str("Collection Name"),
  required: true,
  description,
});

/**
 * Hero-style content fields shared by `hero` and `image-background`:
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
    ...objectList("Buttons", buttonFields({ variant: "primary" })),
    description:
      'Action buttons below the content. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default.',
  },
  reveal: REVEAL_STRING_FIELD,
};
/**
 * Fields of a block that shows a form posting to the site's form service,
 * rendered by `design-system/blocks/contact-form.html`. Each form block
 * differs only in what it asks and where it lands.
 * @param {{ fields: object[], fieldsSummary: string, submitText: string, redirect: string }} defaults
 */
export const formBlockFields = ({
  fields,
  fieldsSummary,
  submitText,
  redirect,
}) => ({
  content: {
    ...md("Content"),
    description:
      "Text shown beside the form, rendered as markdown. Without it the form takes the full width.",
  },
  fields: {
    ...objectList("Form Fields", {
      label: str("Label", { required: true }),
      name: {
        ...str("Name"),
        default: (/** @type {{ label: string }} */ field) => field.label,
        description:
          "Name the answer is submitted under. Defaults to the label.",
      },
      type: {
        ...str("Type"),
        default: "text",
        description:
          "`textarea`, `select`, `radio`, `heading` (a sub-heading between fields, with `note` as its text), or any HTML input type such as `text`, `email`, `tel`, `date`, or `number`.",
      },
      required: bool("Required", { default: false }),
      placeholder: str("Placeholder"),
      note: str("Help Note"),
      options: {
        ...str("Options"),
        list: true,
        description: "Choices of a `select` or `radio` field.",
      },
      rows: {
        ...num("Rows"),
        default: 6,
        description: "Height of a `textarea`, in lines of text.",
      },
    }),
    default: fields,
    description: `The form's fields, in order. Defaults to ${fieldsSummary}.`,
  },
  submit_text: str("Submit Button Text", { default: submitText }),
  redirect: {
    ...str("Redirect"),
    default: redirect,
    description: "Page a visitor lands on after sending the form.",
  },
  intro_content: INTRO_CONTENT_FIELD,
});
/* jscpd:ignore-end */
