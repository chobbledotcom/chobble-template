/**
 * Block schema definitions for landing page blocks.
 *
 * Each block type has a set of allowed keys. Unknown keys will cause
 * a build error to catch typos like "video_url" instead of "video_id".
 */

/**
 * Allowed keys per block type.
 * "type" is implicit and always allowed.
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
    "figure_content",
    "reverse",
    "reveal_content",
    "reveal_figure",
    "button",
  ],
  cta: ["title", "description", "button", "reveal"],
  footer: ["text", "links", "aria_label"],
  "video-background": [
    "video_id",
    "video_title",
    "content",
    "aspect_ratio",
    "overlay_style",
    "class",
  ],
  markdown: ["content"],
  html: ["content"],
};

/**
 * Validates a block against its schema.
 * Throws an error if the block contains unknown keys.
 *
 * @param {object} block - The block to validate
 * @param {string} context - Context for error messages (e.g., file path)
 * @throws {Error} If the block contains unknown keys
 */
const validateBlock = (block, context = "") => {
  const { type } = block;

  if (!type) {
    throw new Error(`Block is missing required "type" field${context}`);
  }

  const allowedKeys = BLOCK_SCHEMAS[type];

  if (!allowedKeys) {
    const validTypes = Object.keys(BLOCK_SCHEMAS).join(", ");
    throw new Error(
      `Unknown block type "${type}"${context}. Valid types: ${validTypes}`,
    );
  }

  const blockKeys = Object.keys(block).filter((key) => key !== "type");
  const unknownKeys = blockKeys.filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length > 0) {
    const unknownList = unknownKeys.map((k) => `"${k}"`).join(", ");
    const allowedList = allowedKeys.map((k) => `"${k}"`).join(", ");
    throw new Error(
      `Block type "${type}" has unknown keys: ${unknownList}${context}. ` +
        `Allowed keys: ${allowedList}`,
    );
  }
};

/**
 * Validates an array of blocks.
 *
 * @param {object[]} blocks - Array of blocks to validate
 * @param {string} context - Context for error messages
 * @throws {Error} If any block contains unknown keys
 */
const validateBlocks = (blocks, context = "") => {
  for (const [index, block] of blocks.entries()) {
    validateBlock(block, ` (block ${index + 1}${context})`);
  }
};

export { BLOCK_SCHEMAS, validateBlock, validateBlocks };
