/**
 * Block schema definitions for design system blocks.
 *
 * Each block type has a set of allowed keys. Unknown keys will cause
 * a build error to catch typos like "video_url" instead of "video_id".
 *
 * Block definitions live in `./block-schema/<type>.js` — one file per type.
 * Each module exports `type`, `schema`, and `docs`. This file aggregates them
 * into `BLOCK_SCHEMAS` (for validation) and `BLOCK_DOCS` (for documentation
 * generation by scripts/generate-blocks-reference.js).
 */

import * as bunnyVideoBackground from "#utils/block-schema/bunny-video-background.js";
import * as codeBlock from "#utils/block-schema/code-block.js";
import * as contactForm from "#utils/block-schema/contact-form.js";
import * as content from "#utils/block-schema/content.js";
import * as cta from "#utils/block-schema/cta.js";
import * as customContactForm from "#utils/block-schema/custom-contact-form.js";
import * as features from "#utils/block-schema/features.js";
import * as gallery from "#utils/block-schema/gallery.js";
import * as guideCategories from "#utils/block-schema/guide-categories.js";
import * as hero from "#utils/block-schema/hero.js";
import * as html from "#utils/block-schema/html.js";
import * as iconLinks from "#utils/block-schema/icon-links.js";
import * as imageBackground from "#utils/block-schema/image-background.js";
import * as imageCards from "#utils/block-schema/image-cards.js";
import * as include from "#utils/block-schema/include.js";
import * as items from "#utils/block-schema/items.js";
import * as itemsArray from "#utils/block-schema/items-array.js";
import * as linkButton from "#utils/block-schema/link-button.js";
import * as markdown from "#utils/block-schema/markdown.js";
import * as properties from "#utils/block-schema/properties.js";
import * as reviews from "#utils/block-schema/reviews.js";
import * as sectionHeader from "#utils/block-schema/section-header.js";
import * as split from "#utils/block-schema/split.js";
import * as splitFull from "#utils/block-schema/split-full.js";
import * as stats from "#utils/block-schema/stats.js";
import * as videoBackground from "#utils/block-schema/video-background.js";

/**
 * Common wrapper keys allowed on all block types.
 * These are used by blocks.html to wrap blocks in sections/containers.
 */
const COMMON_BLOCK_KEYS = ["section_class", "container_width"];

/** Valid values for the common `container_width` block property. */
const CONTAINER_WIDTHS = ["full", "wide", "narrow"];

/**
 * Iteration order determines the order that `scripts/generate-blocks-reference.js`
 * emits block types into BLOCKS_LAYOUT.md, so keep it intentional rather than
 * alphabetical.
 */
const BLOCK_MODULES = [
  sectionHeader,
  features,
  imageCards,
  stats,
  codeBlock,
  hero,
  split,
  splitFull,
  cta,
  videoBackground,
  bunnyVideoBackground,
  imageBackground,
  items,
  itemsArray,
  contactForm,
  customContactForm,
  markdown,
  html,
  content,
  include,
  properties,
  guideCategories,
  linkButton,
  reviews,
  gallery,
  iconLinks,
];

const indexByType = (getValue) =>
  Object.fromEntries(BLOCK_MODULES.map((m) => [m.type, getValue(m)]));

/** Allowed keys per block type (excluding common keys and "type"). */
const BLOCK_SCHEMAS = indexByType((m) => m.schema);

/**
 * CMS field definitions for block types exposed in Pages CMS.
 *
 * This is the single source of truth for the shape of CMS components generated
 * for each block type. Not every block type in BLOCK_SCHEMAS is exposed in the
 * CMS (e.g. `markdown`, `html`, `content`, `include`, `properties`,
 * `guide-categories`, `image-background`, `link-button`, `reviews`, `gallery`,
 * `bunny-video-background`, `image-cards` are rendered by the template engine
 * but aren't editable through the CMS).
 *
 * Every top-level key must be listed in BLOCK_SCHEMAS for the same block type
 * (or in COMMON_BLOCK_KEYS). This invariant is enforced by
 * test/unit/utils/block-schema.test.js.
 *
 * Field shape mirrors the format consumed by scripts/customise-cms/generator.js
 * (schemaFieldToCmsField): `type` is one of "string", "number", "boolean",
 * "image", "object", "markdown", "reference"; `label` is a human-readable UI
 * string; object fields use a nested `fields` object; `list: true` marks
 * repeating values.
 */

// Primitive field factories
/** @param {string} label @param {object} [extras] */
const str = (label, extras) => ({ type: "string", label, ...extras });
/** @param {string} label */
const md = (label) => ({ type: "markdown", label });
/** @param {string} label */
const num = (label) => ({ type: "number", label });
/** @param {string} label */
const bool = (label) => ({ type: "boolean", label });
/** @param {string} label @param {Record<string, object>} fields */
const objectList = (label, fields) => ({
  type: "object",
  list: true,
  label,
  fields,
});
/** @param {string} label @param {Record<string, object>} fields */
const objectField = (label, fields) => ({ type: "object", label, fields });

// Fields common to every block type (container wrapper).
const CONTAINER_FIELDS = {
  container_width: str("Container Width (full, wide, narrow)"),
  section_class: str("Section Class"),
};

// Button fields (shared between hero buttons, split/cta buttons).
const BUTTON_FIELDS_BASE = {
  text: str("Button Text", { required: true }),
  href: str("URL", { required: true }),
  variant: str("Variant"),
};
const BUTTON_FIELDS_WITH_SIZE = {
  ...BUTTON_FIELDS_BASE,
  size: str("Size"),
};

// Filter object fields (shared between items and items_array blocks).
const FILTER_FIELD = objectField("Filter", {
  property: str("Property (e.g. url, data.title)"),
  includes: str("Contains"),
  equals: str("Equals"),
});

const TITLE_REQUIRED = str("Title", { required: true });

// Fields shared between items and items_array blocks.
const ITEMS_SHARED_FIELDS = {
  collection: str("Collection Name", { required: true }),
  intro: md("Intro Content (Markdown)"),
  horizontal: bool("Horizontal Slider"),
  masonry: bool("Masonry Grid"),
  header_intro: md("Header Intro"),
  filter: FILTER_FIELD,
};

/** @type {Record<string, Record<string, object>>} */
const BLOCK_CMS_FIELDS = {
  "section-header": {
    ...CONTAINER_FIELDS,
    intro: md("Section Header Intro"),
  },
  features: {
    ...CONTAINER_FIELDS,
    grid_class: str("Grid Class"),
    heading_level: num("Heading Level"),
    header_intro: md("Header Intro"),
    items: objectList("Features", {
      icon: str("Icon (Iconify ID or HTML entity)"),
      title: TITLE_REQUIRED,
      description: str("Description", { required: true }),
      style: str("Custom Style"),
    }),
  },
  stats: {
    ...CONTAINER_FIELDS,
    items: objectList("Statistics", {
      value: str("Value", { required: true }),
      label: str("Label", { required: true }),
    }),
  },
  "code-block": {
    ...CONTAINER_FIELDS,
    filename: str("Filename", { required: true }),
    code: str("Code", { required: true }),
    language: str("Language"),
  },
  hero: {
    ...CONTAINER_FIELDS,
    class: str("CSS Class"),
    badge: str("Badge Text"),
    title: TITLE_REQUIRED,
    lead: str("Lead Text"),
    buttons: objectList("Buttons", BUTTON_FIELDS_WITH_SIZE),
  },
  "video-background": {
    ...CONTAINER_FIELDS,
    video_id: str("Video Embed URL", { required: true }),
    video_title: str("Video Title"),
    aspect_ratio: str("Aspect Ratio"),
    thumbnail_url: str("Thumbnail URL"),
    class: str("CSS Class"),
    content: md("Overlay Content"),
  },
  "split-full": {
    ...CONTAINER_FIELDS,
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
  },
  split: {
    ...CONTAINER_FIELDS,
    title: str("Title"),
    title_level: num("Heading Level"),
    subtitle: str("Subtitle"),
    reverse: bool("Reverse Layout"),
    reveal_content: str("Reveal Content Animation"),
    reveal_figure: str("Reveal Figure Animation"),
    content: md("Content"),
    button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
    figure_type: str("Figure Type (image, video, code, html)"),
    figure_src: { type: "image", label: "Figure Image" },
    figure_alt: str("Figure Alt Text"),
    figure_caption: str("Figure Caption"),
    figure_video_id: str("Figure Video ID or URL"),
    figure_filename: str("Figure Code Filename"),
    figure_code: str("Figure Code Content"),
    figure_language: str("Figure Code Language"),
    figure_html: md("Figure HTML Content"),
  },
  cta: {
    ...CONTAINER_FIELDS,
    title: TITLE_REQUIRED,
    description: str("Description"),
    button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
  },
  items: {
    ...CONTAINER_FIELDS,
    ...ITEMS_SHARED_FIELDS,
  },
  items_array: {
    ...CONTAINER_FIELDS,
    collection: ITEMS_SHARED_FIELDS.collection,
    items: {
      type: "reference",
      label: "Items",
      collection: "pages",
      search: "title",
      multiple: true,
    },
    intro: ITEMS_SHARED_FIELDS.intro,
    horizontal: ITEMS_SHARED_FIELDS.horizontal,
    masonry: ITEMS_SHARED_FIELDS.masonry,
    header_intro: ITEMS_SHARED_FIELDS.header_intro,
    filter: ITEMS_SHARED_FIELDS.filter,
  },
  icon_links: {
    ...CONTAINER_FIELDS,
    intro: md("Intro Content (Markdown)"),
    items: objectList("Links", {
      icon: str("Icon (Iconify ID or HTML entity)", { required: true }),
      text: str("Link Text", { required: true }),
      url: str("URL"),
    }),
  },
  contact_form: {
    ...CONTAINER_FIELDS,
    content: md("Content"),
  },
};

/**
 * Documentation metadata for each block type.
 * Used by scripts/generate-blocks-reference.js to auto-generate BLOCKS_LAYOUT.md.
 *
 * Each block has:
 *   summary  - One-line description
 *   template - Path to the include template (omit for inline blocks)
 *   scss     - Path to the SCSS file (omit if none)
 *   htmlRoot - Root HTML element/class
 *   notes    - Optional extra notes rendered after the parameter table
 *   params   - Object of parameter docs: { key: { type, required?, default?, description } }
 */
const BLOCK_DOCS = indexByType((m) => m.docs);

const quoteJoin = (arr) => arr.map((k) => `"${k}"`).join(", ");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/**
 * Validates a single block against its schema.
 * Throws an error if the block contains unknown keys or unknown type.
 *
 * @param {object} block - Block to validate
 * @param {string} ctx - Context suffix for error messages
 * @throws {Error} If the block contains unknown keys or invalid type
 */
const validateBlock = (block, ctx) => {
  assert(block.type, `Block is missing required "type" field${ctx}`);

  const allowedKeys = BLOCK_SCHEMAS[block.type];
  assert(
    allowedKeys,
    `Unknown block type "${block.type}"${ctx}. Valid types: ${Object.keys(BLOCK_SCHEMAS).join(", ")}`,
  );

  const allAllowed = [...allowedKeys, ...COMMON_BLOCK_KEYS];
  const unknown = Object.keys(block).filter(
    (k) => k !== "type" && !allAllowed.includes(k),
  );
  assert(
    unknown.length === 0,
    `Block type "${block.type}" has unknown keys: ${quoteJoin(unknown)}${ctx}. Allowed keys: ${quoteJoin(allAllowed)}`,
  );

  assert(
    block.container_width === undefined ||
      CONTAINER_WIDTHS.includes(block.container_width),
    `Block type "${block.type}" has invalid container_width "${block.container_width}"${ctx}. Valid values: ${CONTAINER_WIDTHS.join(", ")}`,
  );
};

/**
 * Validates an array of blocks against their schemas.
 * Throws an error if any block contains unknown keys or unknown type.
 *
 * @param {object[]} blocks - Array of blocks to validate
 * @param {string} context - Context for error messages (e.g., file path)
 * @throws {Error} If any block contains unknown keys or invalid type
 */
const validateBlocks = (blocks, context = "") => {
  for (const [index, block] of blocks.entries()) {
    validateBlock(block, ` (block ${index + 1}${context})`);
  }
};

export {
  BLOCK_CMS_FIELDS,
  BLOCK_DOCS,
  BLOCK_SCHEMAS,
  validateBlock,
  validateBlocks,
};
