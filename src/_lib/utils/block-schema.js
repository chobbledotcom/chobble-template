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

// Iteration order determines the order that `scripts/generate-blocks-reference.js`
// emits block types into BLOCKS_LAYOUT.md, so keep it intentional rather than
// alphabetical.
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

export { BLOCK_DOCS, BLOCK_SCHEMAS, validateBlock, validateBlocks };
