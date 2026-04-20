/**
 * Block schema definitions for design system blocks.
 *
 * Each block module in `./block-schema/<type>.js` exports:
 *   - `type`   — block type slug
 *   - `fields` — unified field definitions (CMS + doc info per key)
 *   - `docs`   — metadata (summary, template, scss, htmlRoot, notes)
 *   - optionally `containerWidth` ("full" | "narrow"; defaults to "wide")
 *
 * This file aggregates them into:
 *   - `BLOCK_SCHEMAS`    — field definitions per type, used for both
 *     allowed-key checks and runtime value-shape validation. Indexed by
 *     block type; each entry maps field name → `{ type, list?, ... }`.
 *   - `BLOCK_CMS_FIELDS` — CMS field definitions (for .pages.yml generation)
 *   - `BLOCK_DOCS`       — documentation (for BLOCKS_LAYOUT.md generation)
 */

import * as bunnyVideoBackground from "#utils/block-schema/bunny-video-background.js";
import * as buyOptions from "#utils/block-schema/buy-options.js";
import * as callout from "#utils/block-schema/callout.js";
import * as codeBlock from "#utils/block-schema/code-block.js";
import * as contactForm from "#utils/block-schema/contact-form.js";
import * as content from "#utils/block-schema/content.js";
import * as cta from "#utils/block-schema/cta.js";
import * as customContactForm from "#utils/block-schema/custom-contact-form.js";
import * as downloads from "#utils/block-schema/downloads.js";
import * as features from "#utils/block-schema/features.js";
import * as gallery from "#utils/block-schema/gallery.js";
import * as guideCategories from "#utils/block-schema/guide-categories.js";
import * as hero from "#utils/block-schema/hero.js";
import * as html from "#utils/block-schema/html.js";
import * as iconLinks from "#utils/block-schema/icon-links.js";
import * as iframeEmbed from "#utils/block-schema/iframe-embed.js";
import * as imageBackground from "#utils/block-schema/image-background.js";
import * as imageCards from "#utils/block-schema/image-cards.js";
import * as include from "#utils/block-schema/include.js";
import * as items from "#utils/block-schema/items.js";
import * as itemsArray from "#utils/block-schema/items-array.js";
import * as linkButton from "#utils/block-schema/link-button.js";
import * as linkColumns from "#utils/block-schema/link-columns.js";
import * as markdown from "#utils/block-schema/markdown.js";
import * as marqueeImages from "#utils/block-schema/marquee-images.js";
import * as properties from "#utils/block-schema/properties.js";
import * as reviews from "#utils/block-schema/reviews.js";
import * as sectionHeader from "#utils/block-schema/section-header.js";
import { CONTAINER_FIELDS } from "#utils/block-schema/shared.js";
import * as snippet from "#utils/block-schema/snippet.js";
import * as socials from "#utils/block-schema/socials.js";
import * as splitBuyOptions from "#utils/block-schema/split-buy-options.js";
import * as splitCallout from "#utils/block-schema/split-callout.js";
import * as splitCode from "#utils/block-schema/split-code.js";
import * as splitFull from "#utils/block-schema/split-full.js";
import * as splitHtml from "#utils/block-schema/split-html.js";
import * as splitIconLinks from "#utils/block-schema/split-icon-links.js";
import * as splitImage from "#utils/block-schema/split-image.js";
import * as splitVideo from "#utils/block-schema/split-video.js";
import * as stats from "#utils/block-schema/stats.js";
import * as videoBackground from "#utils/block-schema/video-background.js";

/**
 * Iteration order determines the order that `scripts/generate-blocks-reference.js`
 * emits block types into BLOCKS_LAYOUT.md, so keep it intentional rather than
 * alphabetical.
 */
const BLOCK_MODULES = [
  sectionHeader,
  features,
  imageCards,
  buyOptions,
  stats,
  codeBlock,
  hero,
  splitImage,
  splitVideo,
  splitCode,
  splitIconLinks,
  splitHtml,
  splitCallout,
  splitBuyOptions,
  splitFull,
  cta,
  callout,
  videoBackground,
  bunnyVideoBackground,
  imageBackground,
  items,
  itemsArray,
  socials,
  linkColumns,
  contactForm,
  customContactForm,
  markdown,
  html,
  iframeEmbed,
  content,
  include,
  properties,
  guideCategories,
  linkButton,
  reviews,
  gallery,
  marqueeImages,
  iconLinks,
  downloads,
  snippet,
];

/**
 * @typedef {(typeof BLOCK_MODULES)[number]} BlockModule
 */

/**
 * @template T
 * @param {(module: BlockModule) => T} getValue
 * @returns {Record<string, T>}
 */
const indexByType = (getValue) =>
  Object.fromEntries(BLOCK_MODULES.map((m) => [m.type, getValue(m)]));

const DOC_TYPE_MAP = {
  markdown: "string",
  image: "string",
  reference: "string",
};

const BLOCK_SCHEMAS = indexByType((m) => m.fields);

/** @type {Record<string, "full" | "wide" | "narrow">} */
const BLOCK_CONTAINER_WIDTHS = indexByType((m) =>
  "containerWidth" in m ? m.containerWidth : "wide",
);

/** @param {string} blockType */
const getBlockContainerWidth = (blockType) =>
  BLOCK_CONTAINER_WIDTHS[blockType] || "wide";

const BLOCK_CMS_FIELDS = indexByType((m) => ({
  ...CONTAINER_FIELDS,
  ...Object.fromEntries(
    Object.entries(m.fields)
      .filter(([, f]) => "label" in f)
      .map(([key, { description, default: _default, ...cmsProps }]) => [
        key,
        cmsProps,
      ]),
  ),
}));

const BLOCK_DOCS = indexByType((m) => ({
  ...m.docs,
  params: Object.fromEntries(
    Object.entries(m.fields).map(([key, field]) => [
      key,
      {
        type: field.list ? "array" : DOC_TYPE_MAP[field.type] || field.type,
        ...(field.required && { required: true }),
        ...(field.default !== undefined && { default: field.default }),
        description: field.description,
      },
    ]),
  ),
}));

/** @param {readonly string[]} arr */
const quoteJoin = (arr) => arr.map((k) => `"${k}"`).join(", ");

/**
 * @param {unknown} condition
 * @param {string} message
 * @returns {asserts condition}
 */
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/**
 * @typedef {Record<string, unknown>} Block
 */

/** @param {string} t @returns {(v: unknown) => boolean} */
const isTypeof = (t) => (v) => typeof v === t;

/**
 * Per-field-type runtime checks. `image` stores a path string;
 * `reference` stores a collection item slug; `markdown` stores markdown
 * source text passed to markdown-it — all plain strings at runtime.
 * @type {Record<string, { label: string, check: (v: unknown) => boolean }>}
 */
const FIELD_TYPE_CHECKS = {
  string: { label: "a string", check: isTypeof("string") },
  markdown: { label: "a string", check: isTypeof("string") },
  image: { label: "a string", check: isTypeof("string") },
  reference: { label: "a string", check: isTypeof("string") },
  number: { label: "a number", check: isTypeof("number") },
  boolean: { label: "a boolean", check: isTypeof("boolean") },
  object: {
    label: "an object",
    check: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  },
};

const LIST_CHECK = { label: "an array", check: Array.isArray };

/** Field types for wrapper keys (e.g. `dark`) accepted on every block. */
const COMMON_FIELD_TYPES = {
  dark: { type: "boolean" },
};

/**
 * Converts a `{type, list?}` field definition to its runtime type-check
 * spec, or `undefined` if the type has no known check.
 */
const specEntries = (defs) =>
  Object.entries(defs).map(([k, d]) => [
    k,
    d.list ? LIST_CHECK : FIELD_TYPE_CHECKS[d.type],
  ]);

const COMMON_SPEC_ENTRIES = specEntries(COMMON_FIELD_TYPES);

/**
 * Pre-computed per-block lookup of `fieldName -> { label, check }`. Built
 * once at module load so `validateBlock` can do a straight dictionary
 * lookup per field instead of branching on `type` + `list` at runtime.
 *
 * @type {Record<string, Record<string, { label: string, check: (v: unknown) => boolean }>>}
 */
const BLOCK_FIELD_SPECS = Object.fromEntries(
  Object.entries(BLOCK_SCHEMAS).map(([blockType, fieldDefs]) => [
    blockType,
    Object.fromEntries([...specEntries(fieldDefs), ...COMMON_SPEC_ENTRIES]),
  ]),
);

/**
 * Validates a single block against its schema.
 * Throws an error if the block contains unknown keys or unknown type, or
 * if any field value does not match its declared shape.
 *
 * @param {Block} block - Block to validate
 * @param {string} ctx - Context suffix for error messages
 * @throws {Error} If the block fails any validation check
 */
const validateBlock = (block, ctx) => {
  assert(
    typeof block.type === "string",
    `Block is missing required "type" field${ctx}`,
  );
  const specs = BLOCK_FIELD_SPECS[block.type];
  assert(
    specs,
    `Unknown block type "${block.type}"${ctx}. Valid types: ${Object.keys(BLOCK_FIELD_SPECS).join(", ")}`,
  );
  const allowedKeys = [...Object.keys(specs), "type"];
  const unknown = Object.keys(block).filter((k) => !allowedKeys.includes(k));
  assert(
    unknown.length === 0,
    `Block type "${block.type}" has unknown keys: ${quoteJoin(unknown)}${ctx}. Allowed keys: ${quoteJoin(Object.keys(specs))}`,
  );

  for (const [key, value] of Object.entries(block)) {
    const spec = specs[key];
    const skip =
      !spec || value === undefined || value === null || spec.check(value);
    if (skip) continue;
    const actual = Array.isArray(value) ? "array" : typeof value;
    throw new Error(
      `Block "${block.type}" field "${key}" must be ${spec.label} but got ${actual}${ctx}`,
    );
  }
};

/**
 * Validates an array of blocks against their schemas.
 * Throws an error if any block contains unknown keys or unknown type.
 *
 * @param {Block[]} blocks - Array of blocks to validate
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
  getBlockContainerWidth,
  validateBlock,
  validateBlocks,
};
