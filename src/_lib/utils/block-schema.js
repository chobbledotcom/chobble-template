/**
 * Block schema definitions for design system blocks.
 *
 * Each block type has a set of allowed keys. Unknown keys will cause
 * a build error to catch typos like "video_url" instead of "video_id".
 */

/**
 * Common wrapper keys allowed on all block types.
 * These are used by blocks.html to wrap blocks in sections/containers.
 */
const COMMON_BLOCK_KEYS = ["section_class", "full_width"];

/**
 * Allowed keys per block type (excluding common keys and "type").
 */
const BLOCK_SCHEMAS = {
  "section-header": ["title", "subtitle", "level", "align", "class"],
  features: [
    "items",
    "reveal",
    "heading_level",
    "grid_class",
    "header_title",
    "header_subtitle",
  ],
  "image-cards": ["items", "reveal", "heading_level", "image_aspect_ratio"],
  stats: ["items", "reveal"],
  "code-block": ["filename", "code", "language", "reveal"],
  hero: ["badge", "title", "lead", "buttons", "class", "reveal"],
  split: [
    "title",
    "title_level",
    "subtitle",
    "content",
    "figure_type",
    "figure_src",
    "figure_alt",
    "figure_caption",
    "figure_video_id",
    "figure_filename",
    "figure_code",
    "figure_language",
    "figure_html",
    "reverse",
    "reveal_content",
    "reveal_figure",
    "button",
  ],
  "split-full": [
    "variant",
    "title_level",
    "left_title",
    "left_content",
    "left_button",
    "right_title",
    "right_content",
    "right_button",
    "reveal_left",
    "reveal_right",
  ],
  cta: ["title", "description", "button", "reveal"],
  "video-background": [
    "video_id",
    "video_title",
    "content",
    "aspect_ratio",
    "class",
  ],
  "image-background": ["image", "image_alt", "content", "class", "parallax"],
  items: ["collection", "intro", "horizontal"],
  contact_form: [
    "content",
    "header_title",
    "header_subtitle",
    "header_level",
    "header_align",
    "header_class",
  ],
  markdown: ["content"],
  html: ["content"],
  content: [],
  include: ["file"],
  properties: [],
  "guide-categories": [],
  "link-button": ["text", "href", "variant", "size", "reveal"],
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
    const blockContext = ` (block ${index + 1}${context})`;

    if (!block.type) {
      throw new Error(`Block is missing required "type" field${blockContext}`);
    }

    const allowedKeys = BLOCK_SCHEMAS[block.type];

    if (!allowedKeys) {
      const validTypes = Object.keys(BLOCK_SCHEMAS).join(", ");
      throw new Error(
        `Unknown block type "${block.type}"${blockContext}. Valid types: ${validTypes}`,
      );
    }

    const blockKeys = Object.keys(block).filter((key) => key !== "type");
    const allAllowedKeys = [...allowedKeys, ...COMMON_BLOCK_KEYS];
    const unknownKeys = blockKeys.filter(
      (key) => !allAllowedKeys.includes(key),
    );

    if (unknownKeys.length > 0) {
      const quoteJoin = (arr) => arr.map((k) => `"${k}"`).join(", ");
      throw new Error(
        `Block type "${block.type}" has unknown keys: ${quoteJoin(unknownKeys)}${blockContext}. ` +
          `Allowed keys: ${quoteJoin(allAllowedKeys)}`,
      );
    }
  }
};

export { BLOCK_SCHEMAS, validateBlocks };
